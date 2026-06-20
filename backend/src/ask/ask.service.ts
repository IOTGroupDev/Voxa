import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';

export interface AskQuestionDto {
  question: string;
}

export interface AskSourceDto {
  id: string;
  type: AskSourceType;
  title?: string;
  snippet: string;
  createdAt: string;
}

export interface TranscribeAskAudioDto {
  audioBase64: string;
  mimeType?: string;
  durationMs?: number;
}

interface SttResponse {
  text?: unknown;
  language?: unknown;
}

@Injectable()
export class AskService {
  private readonly logger = new Logger(AskService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
  ) {}

  async answer(supabaseUserId: string, dto: AskQuestionDto) {
    const question = dto?.question?.trim();
    if (!question) {
      throw new BadRequestException('question is required.');
    }

    const user = await this.prisma.user.findUnique({ where: { supabaseUserId } });
    if (!user) {
      return {
        answer: isRussianQuestion(question)
          ? 'В вашей памяти не найдено ничего релевантного.'
          : "Nothing relevant was found in the user's memory.",
        sources: [],
      };
    }

    const candidates = await this.retrieveMemories(user.id, question);
    const ranked = rankCandidates(question, candidates).slice(0, 8);
    const sources = ranked.map(toAskSource);

    if (sources.length === 0) {
      this.logger.log(
        `Ask answered without sources user=${user.id} questionLength=${question.length} candidates=${candidates.length}`,
      );
      return {
        answer: isRussianQuestion(question)
          ? 'В вашей памяти не найдено ничего релевантного.'
          : "Nothing relevant was found in the user's memory.",
        sources,
      };
    }

    const context = buildMemoryContext(ranked);
    const { answer } = await this.llmService.generateAnswer({
      question,
      context,
      systemPrompt: ASK_SYSTEM_PROMPT,
    });

    this.logger.log(
      `Ask answered user=${user.id} questionLength=${question.length} candidates=${candidates.length} sources=${sources.length}`,
    );

    return { answer, sources };
  }

  async transcribeQuestion(supabaseUserId: string, dto: TranscribeAskAudioDto) {
    const endpoint = process.env.STT_HTTP_ENDPOINT;
    if (!endpoint) {
      throw new BadRequestException('Voice Ask is not configured.');
    }

    const audioBase64 = dto.audioBase64?.trim();
    if (!audioBase64) {
      throw new BadRequestException('audioBase64 is required.');
    }

    const sizeBytes = Math.ceil(audioBase64.length * 0.75);
    if (sizeBytes > 8 * 1024 * 1024) {
      throw new BadRequestException('Voice question is too long.');
    }

    const recordingId = `ask-${Date.now()}`;
    this.logger.log(
      `Voice Ask transcription started user=${supabaseUserId} recordingId=${recordingId} sizeBytes=${sizeBytes} durationMs=${dto.durationMs ?? 'unknown'}`,
    );

    let response: Response;
    try {
      const payload: Record<string, unknown> = {
        recordingId,
        audioBase64,
        mimeType: dto.mimeType ?? 'audio/mp4',
        durationMs: dto.durationMs,
      };

      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown network error';
      this.logger.error(`Voice Ask transcription unreachable recordingId=${recordingId} error=${message}`);
      throw new BadRequestException(`Voice Ask transcription failed: ${message}`);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const detail = parseSttError(body);
      this.logger.error(
        `Voice Ask transcription failed recordingId=${recordingId} status=${response.status} body=${body.slice(0, 300)}`,
      );
      throw new BadRequestException(`Voice Ask transcription failed: ${detail}`);
    }

    const payload = (await response.json()) as SttResponse;
    if (typeof payload.text !== 'string' || payload.text.trim().length === 0) {
      throw new BadRequestException('Voice Ask returned an empty question.');
    }

    this.logger.log(
      `Voice Ask transcription completed recordingId=${recordingId} language=${typeof payload.language === 'string' ? payload.language : 'unknown'}`,
    );

    return {
      text: payload.text.trim(),
      language: typeof payload.language === 'string' ? payload.language : undefined,
    };
  }

  private async retrieveMemories(userId: string, question: string): Promise<AskCandidate[]> {
    const terms = extractQueryTerms(question);
    const containsFilters = terms.slice(0, 6).map((term) => ({
      contains: term,
      mode: 'insensitive' as const,
    }));

    const [notes, transcripts, memoryEvents, actionItems, reminders] = await Promise.all([
      this.prisma.note.findMany({
        where: {
          userId,
          ...(containsFilters.length
            ? {
                OR: containsFilters.flatMap((filter) => [
                  { title: filter },
                  { summary: filter },
                  { body: filter },
                ]),
              }
            : {}),
        },
        take: 30,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transcript.findMany({
        where: {
          userId,
          ...(containsFilters.length ? { OR: containsFilters.map((filter) => ({ text: filter })) } : {}),
        },
        take: 30,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.memoryEvent.findMany({
        where: {
          userId,
          ...(containsFilters.length
            ? {
                OR: containsFilters.flatMap((filter) => [
                  { title: filter },
                  { summary: filter },
                ]),
              }
            : {}),
        },
        take: 30,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.actionItem.findMany({
        where: {
          userId,
          ...(containsFilters.length
            ? {
                OR: containsFilters.flatMap((filter) => [
                  { title: filter },
                  { description: filter },
                ]),
              }
            : {}),
        },
        take: 30,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.reminder.findMany({
        where: {
          userId,
          ...(containsFilters.length ? { OR: containsFilters.map((filter) => ({ title: filter })) } : {}),
        },
        take: 30,
        orderBy: { remindAt: 'desc' },
      }),
    ]);

    return [
      ...notes.map((note): AskCandidate => ({
        id: note.id,
        type: 'note',
        title: note.title ?? note.summary ?? undefined,
        text: [note.title, note.summary, note.body].filter(Boolean).join('\n'),
        createdAt: note.createdAt,
      })),
      ...transcripts.map((transcript): AskCandidate => ({
        id: transcript.id,
        type: 'transcript',
        title: 'Transcript',
        text: transcript.text,
        createdAt: transcript.createdAt,
      })),
      ...memoryEvents.map((event): AskCandidate => ({
        id: event.id,
        type: 'memory_event',
        title: event.title ?? event.type,
        text: [event.title, event.summary, event.type].filter(Boolean).join('\n'),
        createdAt: event.occurredAt,
      })),
      ...actionItems.map((action): AskCandidate => ({
        id: action.id,
        type: 'task',
        title: action.title,
        text: [action.title, action.description].filter(Boolean).join('\n'),
        createdAt: action.createdAt,
      })),
      ...reminders.map((reminder): AskCandidate => ({
        id: reminder.id,
        type: 'reminder',
        title: reminder.title,
        text: reminder.title,
        createdAt: reminder.createdAt,
      })),
    ].filter((candidate) => candidate.text.trim().length > 0);
  }
}

const ASK_SYSTEM_PROMPT = [
  'You are Voxa.',
  'Answer only using the provided user memory context.',
  "If nothing relevant is found, say that nothing relevant was found in the user's memory.",
  'Do not invent facts.',
  'Keep answers concise.',
  'Always rely on sources.',
].join('\n');

type AskSourceType = 'note' | 'transcript' | 'memory_event' | 'task' | 'reminder';

interface AskCandidate {
  id: string;
  type: AskSourceType;
  title?: string;
  text: string;
  createdAt: Date;
  score?: number;
}

const STOP_WORDS = new Set([
  'what',
  'when',
  'where',
  'about',
  'show',
  'find',
  'did',
  'the',
  'and',
  'for',
  'with',
  'что',
  'где',
  'когда',
  'про',
  'мне',
  'говорил',
  'говорила',
  'покажи',
  'найди',
  'как',
  'это',
]);

function extractQueryTerms(question: string) {
  const normalized = question
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2 && !STOP_WORDS.has(term));

  return Array.from(new Set(normalized));
}

function rankCandidates(question: string, candidates: AskCandidate[]) {
  const terms = extractQueryTerms(question);
  const questionLower = question.toLowerCase();

  return candidates
    .map((candidate) => {
      const haystack = `${candidate.title ?? ''}\n${candidate.text}`.toLowerCase();
      const score =
        terms.reduce((total, term) => {
          const exact = haystack.includes(term) ? 2 : 0;
          const titleBoost = candidate.title?.toLowerCase().includes(term) ? 2 : 0;
          return total + exact + titleBoost;
        }, 0) + (haystack.includes(questionLower) ? 4 : 0);

      return { ...candidate, score };
    })
    .filter((candidate) => (terms.length ? (candidate.score ?? 0) > 0 : true))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.createdAt.getTime() - a.createdAt.getTime());
}

function toAskSource(candidate: AskCandidate): AskSourceDto {
  return {
    id: candidate.id,
    type: candidate.type,
    title: candidate.title,
    snippet: createSnippet(candidate.text),
    createdAt: candidate.createdAt.toISOString(),
  };
}

function createSnippet(text: string) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  return normalized.length > 260 ? `${normalized.slice(0, 257)}...` : normalized;
}

function buildMemoryContext(candidates: AskCandidate[]) {
  return candidates
    .map((candidate, index) => {
      const title = candidate.title ? `\nTitle: ${candidate.title}` : '';
      return [
        `Source ${index + 1}`,
        `ID: ${candidate.id}`,
        `Type: ${candidate.type}`,
        `Created at: ${candidate.createdAt.toISOString()}`,
        `${title}`,
        `Text: ${truncateContextText(candidate.text)}`,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n---\n\n');
}

function truncateContextText(text: string) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  return normalized.length > 1_500 ? `${normalized.slice(0, 1_497)}...` : normalized;
}

function isRussianQuestion(question: string) {
  return /[а-яё]/i.test(question);
}

function parseSttError(body: string) {
  if (!body.trim()) {
    return 'STT service returned an error.';
  }

  try {
    const payload = JSON.parse(body) as { detail?: unknown; message?: unknown };
    if (typeof payload.detail === 'string') {
      return payload.detail;
    }
    if (typeof payload.message === 'string') {
      return payload.message;
    }
  } catch {
    return body.slice(0, 200);
  }

  return body.slice(0, 200);
}
