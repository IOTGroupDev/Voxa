import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';

interface GenerateDigestInput {
  date?: string;
  regenerate?: boolean;
}

export type DigestSourceType = 'note' | 'transcript' | 'memory_event' | 'task' | 'reminder' | 'recording';

export interface DigestSource {
  id: string;
  type: DigestSourceType;
  title?: string;
  snippet: string;
  createdAt: string;
}

interface StructuredDigest {
  summary: string;
  importantEvents: string[];
  ideas: string[];
  tasks: string[];
  reminders: string[];
  openQuestions: string[];
  suggestedTomorrowFocus: string[];
}

@Injectable()
export class TodayDigestService {
  private readonly logger = new Logger(TodayDigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
  ) {}

  async getDigest(supabaseUserId: string, dateInput?: string) {
    const date = normalizeDigestDate(dateInput);
    const user = await this.prisma.user.findUnique({ where: { supabaseUserId } });
    if (!user) {
      return emptyDigestResponse(date);
    }

    const digest = await this.prisma.dailySummary.findUnique({
      where: { userId_date: { userId: user.id, date: date.dayStart } },
    });

    return digest ? toDigestResponse(digest, date.isoDate, false) : emptyDigestResponse(date);
  }

  async generateDigest(supabaseUserId: string, email: string | undefined, input: GenerateDigestInput) {
    const date = normalizeDigestDate(input.date);
    const user = await this.prisma.user.upsert({
      where: { supabaseUserId },
      update: { email },
      create: { supabaseUserId, email },
    });

    const existing = await this.prisma.dailySummary.findUnique({
      where: { userId_date: { userId: user.id, date: date.dayStart } },
    });

    if (existing && !input.regenerate) {
      this.logger.log(`Daily digest reused userId=${user.id} date=${date.isoDate}`);
      return toDigestResponse(existing, date.isoDate, false);
    }

    const memories = await this.collectDayMemories(user.id, date.dayStart, date.dayEnd);
    const sources = buildDigestSources(memories);
    if (sources.length === 0) {
      this.logger.log(`Daily digest skipped empty day userId=${user.id} date=${date.isoDate}`);
      return emptyDigestResponse(date);
    }

    const context = buildDigestContext(memories);
    const { answer } = await this.llmService.generateAnswer({
      question: `Create the daily digest for ${date.isoDate}.`,
      context,
      systemPrompt: DAILY_DIGEST_SYSTEM_PROMPT,
    });
    const structured = parseStructuredDigest(answer);
    const generatedAt = new Date().toISOString();
    const metadata = createDigestMetadata(structured, sources, memories.counts, generatedAt, Boolean(existing));

    const digest = await this.prisma.dailySummary.upsert({
      where: { userId_date: { userId: user.id, date: date.dayStart } },
      update: {
        summary: structured.summary,
        metadata,
      },
      create: {
        userId: user.id,
        date: date.dayStart,
        summary: structured.summary,
        metadata,
      },
    });

    this.logger.log(
      `Daily digest generated userId=${user.id} date=${date.isoDate} notes=${memories.counts.notes} transcripts=${memories.counts.transcripts} memoryEvents=${memories.counts.memoryEvents} sources=${sources.length}`,
    );

    return toDigestResponse(digest, date.isoDate, true);
  }

  private async collectDayMemories(userId: string, dayStart: Date, dayEnd: Date) {
    const [notes, transcripts, actionItems, reminders, memoryEvents, captureSessions, recordings] = await Promise.all([
      this.prisma.note.findMany({
        where: { userId, createdAt: { gte: dayStart, lt: dayEnd } },
        include: {
          actionItems: true,
          reminders: true,
          memoryEvent: {
            include: {
              memoryThread: true,
              recording: { include: { transcript: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.transcript.findMany({
        where: { userId, createdAt: { gte: dayStart, lt: dayEnd } },
        include: { recording: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.actionItem.findMany({
        where: {
          userId,
          OR: [{ createdAt: { gte: dayStart, lt: dayEnd } }, { dueAt: { gte: dayStart, lt: dayEnd } }],
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.reminder.findMany({
        where: {
          userId,
          OR: [{ createdAt: { gte: dayStart, lt: dayEnd } }, { remindAt: { gte: dayStart, lt: dayEnd } }],
        },
        orderBy: { remindAt: 'asc' },
      }),
      this.prisma.memoryEvent.findMany({
        where: { userId, occurredAt: { gte: dayStart, lt: dayEnd } },
        include: {
          memoryThread: true,
          note: { include: { actionItems: true, reminders: true } },
          recording: { include: { transcript: true } },
        },
        orderBy: { occurredAt: 'asc' },
      }),
      this.prisma.captureSession.findMany({
        where: { userId, startedAt: { gte: dayStart, lt: dayEnd } },
        include: { recording: true },
        orderBy: { startedAt: 'asc' },
      }),
      this.prisma.recording.findMany({
        where: { userId, createdAt: { gte: dayStart, lt: dayEnd } },
        include: { transcript: true, memoryEvent: { include: { note: true } } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      notes,
      transcripts,
      actionItems,
      reminders,
      memoryEvents,
      captureSessions,
      recordings,
      counts: {
        notes: notes.length,
        transcripts: transcripts.length,
        tasks: actionItems.length,
        reminders: reminders.length,
        memoryEvents: memoryEvents.length,
        captureSessions: captureSessions.length,
        recordings: recordings.length,
      },
    };
  }
}

const DAILY_DIGEST_SYSTEM_PROMPT = [
  'You are Voxa.',
  '',
  "Create a concise daily summary using only the user's memory context for this date.",
  '',
  'Do not invent facts.',
  '',
  'If there is not enough data, say that the day has too few memories.',
  '',
  'Return structured JSON only with:',
  '- summary',
  '- importantEvents',
  '- ideas',
  '- tasks',
  '- reminders',
  '- openQuestions',
  '- suggestedTomorrowFocus',
].join('\n');

function normalizeDigestDate(input?: string) {
  const isoDate = input?.trim() || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    throw new BadRequestException('date must be in YYYY-MM-DD format.');
  }

  const dayStart = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(dayStart.getTime())) {
    throw new BadRequestException('date must be a valid date.');
  }

  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  return { isoDate, dayStart, dayEnd };
}

function emptyDigestResponse(date: ReturnType<typeof normalizeDigestDate>) {
  return {
    date: date.isoDate,
    summary: null,
    importantEvents: [],
    ideas: [],
    tasks: [],
    reminders: [],
    openQuestions: [],
    suggestedTomorrowFocus: [],
    sources: [],
    generatedAt: null,
    metadata: null,
    hasDigest: false,
    generated: false,
  };
}

function toDigestResponse(
  digest: { id: string; date: Date; summary: string | null; metadata: unknown; createdAt: Date; updatedAt: Date },
  isoDate: string,
  generated: boolean,
) {
  const metadata = normalizeDigestMetadata(digest.metadata);
  const structured = metadata.structured;
  return {
    id: digest.id,
    date: isoDate,
    summary: structured.summary || digest.summary || '',
    importantEvents: structured.importantEvents,
    ideas: structured.ideas,
    tasks: structured.tasks,
    reminders: structured.reminders,
    openQuestions: structured.openQuestions,
    suggestedTomorrowFocus: structured.suggestedTomorrowFocus,
    sources: metadata.sources,
    generatedAt: metadata.generatedAt ?? digest.updatedAt.toISOString(),
    metadata: digest.metadata,
    hasDigest: Boolean(digest.summary),
    generated,
    createdAt: digest.createdAt.toISOString(),
    updatedAt: digest.updatedAt.toISOString(),
  };
}

interface DigestContextMemories {
  notes: Array<{
    id: string;
    title?: string | null;
    summary?: string | null;
    body?: string | null;
    createdAt: Date;
  }>;
  transcripts: Array<{
    id: string;
    text: string;
    createdAt: Date;
  }>;
  actionItems: Array<{
    id: string;
    title: string;
    description?: string | null;
    dueAt?: Date | null;
    createdAt: Date;
  }>;
  reminders: Array<{
    id: string;
    title: string;
    remindAt: Date;
  }>;
  memoryEvents: Array<{
    id: string;
    type: string;
    title?: string | null;
    summary?: string | null;
    occurredAt: Date;
    note?: { summary?: string | null } | null;
    memoryThread?: { title?: string | null } | null;
  }>;
  captureSessions: Array<{
    id: string;
    source: string;
    status: string;
    buttonGesture?: string | null;
    startedAt: Date;
    recording?: { durationMs?: number | null } | null;
  }>;
  recordings: Array<{
    id: string;
    status: string;
    durationMs?: number | null;
    mimeType?: string | null;
    createdAt: Date;
    transcript?: { text: string } | null;
    memoryEvent?: { title?: string | null; summary?: string | null; note?: { summary?: string | null; body?: string | null } | null } | null;
  }>;
  counts: {
    notes: number;
    transcripts: number;
    tasks: number;
    reminders: number;
    memoryEvents: number;
    captureSessions: number;
    recordings: number;
  };
}

function buildDigestContext(memories: DigestContextMemories) {
  const sections = [
    renderItems(
      'Notes',
      memories.notes.map((note) => ({
        id: note.id,
        at: note.createdAt,
        text: [note.title, note.summary, note.body].filter(Boolean).join(' | '),
      })),
    ),
    renderItems(
      'Transcripts',
      memories.transcripts.map((transcript) => ({
        id: transcript.id,
        at: transcript.createdAt,
        text: transcript.text,
      })),
    ),
    renderItems(
      'Tasks',
      memories.actionItems.map((task) => ({
        id: task.id,
        at: task.dueAt ?? task.createdAt,
        text: [task.title, task.description, task.dueAt ? `due ${task.dueAt.toISOString()}` : null]
          .filter(Boolean)
          .join(' | '),
      })),
    ),
    renderItems(
      'Reminders',
      memories.reminders.map((reminder) => ({
        id: reminder.id,
        at: reminder.remindAt,
        text: `${reminder.title} | remind at ${reminder.remindAt.toISOString()}`,
      })),
    ),
    renderItems(
      'Memory Events',
      memories.memoryEvents.map((event) => ({
        id: event.id,
        at: event.occurredAt,
        text: [
          `type ${event.type}`,
          event.title,
          event.summary,
          event.note?.summary,
          event.memoryThread?.title ? `topic ${event.memoryThread.title}` : null,
        ]
          .filter(Boolean)
          .join(' | '),
      })),
    ),
    renderItems(
      'Capture Sessions',
      memories.captureSessions.map((session) => ({
        id: session.id,
        at: session.startedAt,
        text: [
          `source ${session.source}`,
          `status ${session.status}`,
          session.buttonGesture ? `gesture ${session.buttonGesture}` : null,
          session.recording?.durationMs ? `duration ${Math.round(session.recording.durationMs / 1000)} seconds` : null,
        ]
          .filter(Boolean)
          .join(' | '),
      })),
    ),
    renderItems(
      'Recordings',
      memories.recordings.map((recording) => ({
        id: recording.id,
        at: recording.createdAt,
        text: [
          `status ${recording.status}`,
          recording.durationMs ? `duration ${Math.round(recording.durationMs / 1000)} seconds` : null,
          recording.memoryEvent?.title,
          recording.memoryEvent?.summary,
          recording.memoryEvent?.note?.summary,
          recording.memoryEvent?.note?.body,
          recording.transcript?.text,
        ]
          .filter(Boolean)
          .join(' | '),
      })),
    ),
  ];

  const context = sections.filter(Boolean).join('\n\n');
  return context || 'No memory context was found for this day.';
}

function renderItems(title: string, items: Array<{ id: string; at: Date; text: string }>) {
  if (!items.length) {
    return '';
  }

  return [`## ${title}`, ...items.slice(0, 40).map((item) => `- ${item.at.toISOString()} [${item.id}]: ${truncate(item.text)}`)].join('\n');
}

function truncate(text: string) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  return normalized.length > 900 ? `${normalized.slice(0, 897)}...` : normalized;
}

function buildDigestSources(memories: DigestContextMemories): DigestSource[] {
  const sources: DigestSource[] = [
    ...memories.notes.map((note) => ({
      id: note.id,
      type: 'note' as const,
      title: note.title ?? note.summary ?? undefined,
      snippet: createSnippet([note.title, note.summary, note.body].filter(Boolean).join(' | ')),
      createdAt: note.createdAt.toISOString(),
    })),
    ...memories.transcripts.map((transcript) => ({
      id: transcript.id,
      type: 'transcript' as const,
      title: 'Transcript',
      snippet: createSnippet(transcript.text),
      createdAt: transcript.createdAt.toISOString(),
    })),
    ...memories.memoryEvents.map((event) => ({
      id: event.id,
      type: 'memory_event' as const,
      title: event.title ?? event.type,
      snippet: createSnippet([event.title, event.summary, event.note?.summary, event.memoryThread?.title].filter(Boolean).join(' | ')),
      createdAt: event.occurredAt.toISOString(),
    })),
    ...memories.actionItems.map((task) => ({
      id: task.id,
      type: 'task' as const,
      title: task.title,
      snippet: createSnippet([task.title, task.description, task.dueAt ? `due ${task.dueAt.toISOString()}` : null].filter(Boolean).join(' | ')),
      createdAt: task.createdAt.toISOString(),
    })),
    ...memories.reminders.map((reminder) => ({
      id: reminder.id,
      type: 'reminder' as const,
      title: reminder.title,
      snippet: createSnippet(`${reminder.title} | remind at ${reminder.remindAt.toISOString()}`),
      createdAt: reminder.remindAt.toISOString(),
    })),
    ...memories.recordings.map((recording) => ({
      id: recording.id,
      type: 'recording' as const,
      title: recording.memoryEvent?.title ?? 'Recording',
      snippet: createSnippet(
        [
          recording.memoryEvent?.summary,
          recording.memoryEvent?.note?.summary,
          recording.memoryEvent?.note?.body,
          recording.transcript?.text,
          `status ${recording.status}`,
        ]
          .filter(Boolean)
          .join(' | '),
      ),
      createdAt: recording.createdAt.toISOString(),
    })),
  ];

  const seen = new Set<string>();
  return sources
    .filter((source) => source.snippet.length > 0)
    .filter((source) => {
      const key = `${source.type}:${source.id}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 30);
}

function createSnippet(text: string) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  return normalized.length > 260 ? `${normalized.slice(0, 257)}...` : normalized;
}

function parseStructuredDigest(answer: string): StructuredDigest {
  const payload = parseJsonObject(answer);
  return {
    summary: readString(payload.summary) || 'The day has too few memories.',
    importantEvents: readStringArray(payload.importantEvents),
    ideas: readStringArray(payload.ideas),
    tasks: readStringArray(payload.tasks),
    reminders: readStringArray(payload.reminders),
    openQuestions: readStringArray(payload.openQuestions),
    suggestedTomorrowFocus: readStringArray(payload.suggestedTomorrowFocus),
  };
}

function parseJsonObject(answer: string): Record<string, unknown> {
  const cleaned = answer
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return { summary: answer.trim() };
  }
}

function normalizeDigestMetadata(metadata: unknown): {
  generatedAt?: string;
  structured: StructuredDigest;
  sources: DigestSource[];
} {
  const payload = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? (metadata as Record<string, unknown>) : {};
  const structuredPayload =
    payload.structured && typeof payload.structured === 'object' && !Array.isArray(payload.structured)
      ? (payload.structured as Record<string, unknown>)
      : {};

  return {
    generatedAt: readString(payload.generatedAt) || readString(payload.regeneratedAt) || undefined,
    structured: {
      summary: readString(structuredPayload.summary),
      importantEvents: readStringArray(structuredPayload.importantEvents),
      ideas: readStringArray(structuredPayload.ideas),
      tasks: readStringArray(structuredPayload.tasks),
      reminders: readStringArray(structuredPayload.reminders),
      openQuestions: readStringArray(structuredPayload.openQuestions),
      suggestedTomorrowFocus: readStringArray(structuredPayload.suggestedTomorrowFocus),
    },
    sources: readSources(payload.sources),
  };
}

function readSources(value: unknown): DigestSource[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }
    const source = item as Record<string, unknown>;
    const id = readString(source.id);
    const type = readString(source.type);
    const snippet = readString(source.snippet);
    const createdAt = readString(source.createdAt);
    if (!id || !isDigestSourceType(type) || !snippet || !createdAt) {
      return [];
    }
    return [
      {
        id,
        type,
        title: readString(source.title) || undefined,
        snippet,
        createdAt,
      },
    ];
  });
}

function isDigestSourceType(value: string): value is DigestSourceType {
  return ['note', 'transcript', 'memory_event', 'task', 'reminder', 'recording'].includes(value);
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean) : [];
}

function createDigestMetadata(
  structured: StructuredDigest,
  sources: DigestSource[],
  counts: DigestContextMemories['counts'],
  generatedAt: string,
  regenerated: boolean,
): Prisma.InputJsonObject {
  return {
    generatedBy: 'llm',
    generatedAt,
    regeneratedAt: regenerated ? generatedAt : null,
    counts: {
      notes: counts.notes,
      transcripts: counts.transcripts,
      tasks: counts.tasks,
      reminders: counts.reminders,
      memoryEvents: counts.memoryEvents,
      captureSessions: counts.captureSessions,
      recordings: counts.recordings,
    },
    structured: {
      summary: structured.summary,
      importantEvents: structured.importantEvents,
      ideas: structured.ideas,
      tasks: structured.tasks,
      reminders: structured.reminders,
      openQuestions: structured.openQuestions,
      suggestedTomorrowFocus: structured.suggestedTomorrowFocus,
    },
    sources: sources.map((source) => ({
      id: source.id,
      type: source.type,
      title: source.title ?? null,
      snippet: source.snippet,
      createdAt: source.createdAt,
    })),
  };
}
