import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ExportFormat = 'text' | 'markdown';

interface ExportSection {
  title: string;
  body?: string | null;
  items?: string[];
}

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportNote(supabaseUserId: string, id: string, formatInput?: ExportFormat) {
    const format = normalizeFormat(formatInput);
    const note = await this.prisma.note.findFirst({
      where: { id, user: { supabaseUserId } },
      include: {
        actionItems: true,
        reminders: true,
        memoryEvent: {
          include: {
            recording: { include: { transcript: true } },
            memoryThread: true,
          },
        },
        entityMentions: {
          include: { entity: true },
        },
      },
    });
    if (!note) throw new NotFoundException('Note not found.');

    return renderExport(format, {
      title: note.title ?? note.summary ?? 'Note',
      date: note.createdAt,
      sections: [
        { title: 'Summary', body: note.summary },
        { title: 'Note', body: note.body },
        { title: 'Transcript', body: note.memoryEvent.recording?.transcript?.text },
        { title: 'Tasks', items: note.actionItems.map((task) => formatTask(task.title, task.dueAt)) },
        { title: 'Reminders', items: note.reminders.map((reminder) => `${reminder.title} — ${reminder.remindAt.toISOString()}`) },
        { title: 'Sources', items: [note.memoryEvent.memoryThread?.title, ...note.entityMentions.map((mention) => mention.entity.name)].filter(Boolean) as string[] },
      ],
    });
  }

  async exportTranscript(supabaseUserId: string, id: string, formatInput?: ExportFormat) {
    const format = normalizeFormat(formatInput);
    const transcript = await this.prisma.transcript.findFirst({
      where: { id, user: { supabaseUserId } },
      include: {
        recording: {
          include: {
            memoryEvent: {
              include: {
                note: { include: { actionItems: true, reminders: true } },
                memoryThread: true,
              },
            },
          },
        },
        entityMentions: { include: { entity: true } },
      },
    });
    if (!transcript) throw new NotFoundException('Transcript not found.');

    const note = transcript.recording.memoryEvent?.note;
    return renderExport(format, {
      title: note?.title ?? transcript.recording.memoryEvent?.title ?? 'Transcript',
      date: transcript.createdAt,
      sections: [
        { title: 'Summary', body: note?.summary ?? transcript.recording.memoryEvent?.summary },
        { title: 'Transcript', body: transcript.text },
        { title: 'Tasks', items: note?.actionItems.map((task) => formatTask(task.title, task.dueAt)) ?? [] },
        { title: 'Reminders', items: note?.reminders.map((reminder) => `${reminder.title} — ${reminder.remindAt.toISOString()}`) ?? [] },
        { title: 'Sources', items: [transcript.provider, transcript.recording.memoryEvent?.memoryThread?.title, ...transcript.entityMentions.map((mention) => mention.entity.name)].filter(Boolean) as string[] },
      ],
    });
  }

  async exportDailyDigest(supabaseUserId: string, dateInput: string, formatInput?: ExportFormat) {
    const format = normalizeFormat(formatInput);
    const date = normalizeDate(dateInput);
    const digest = await this.prisma.dailySummary.findFirst({
      where: { date, user: { supabaseUserId } },
    });
    if (!digest) throw new NotFoundException('Daily digest not found.');

    return renderExport(format, {
      title: `Daily Digest ${dateInput}`,
      date: digest.date,
      sections: [
        { title: 'Summary', body: digest.summary },
        { title: 'Sources', items: ['DailySummary'] },
      ],
    });
  }

  async exportEntity(supabaseUserId: string, id: string, formatInput?: ExportFormat) {
    const format = normalizeFormat(formatInput);
    const entity = await this.prisma.entity.findFirst({
      where: { id, user: { supabaseUserId } },
      include: {
        mentions: {
          orderBy: { createdAt: 'desc' },
          include: {
            note: { include: { actionItems: true, reminders: true } },
            transcript: true,
            memoryEvent: true,
          },
        },
        outgoingRelations: { include: { targetEntity: true } },
        incomingRelations: { include: { sourceEntity: true } },
      },
    });
    if (!entity) throw new NotFoundException('Entity not found.');

    const tasks = entity.mentions.flatMap((mention) => mention.note?.actionItems.map((task) => formatTask(task.title, task.dueAt)) ?? []);
    const reminders = entity.mentions.flatMap((mention) => mention.note?.reminders.map((reminder) => `${reminder.title} — ${reminder.remindAt.toISOString()}`) ?? []);
    const memorySummaries = entity.mentions.map((mention) => mention.note?.summary ?? mention.note?.body ?? mention.transcript?.text ?? mention.memoryEvent?.summary).filter(Boolean) as string[];
    const relations = [
      ...entity.outgoingRelations.map((relation) => `${entity.name} ${relation.relationType} ${relation.targetEntity.name}`),
      ...entity.incomingRelations.map((relation) => `${relation.sourceEntity.name} ${relation.relationType} ${entity.name}`),
    ];

    return renderExport(format, {
      title: entity.name,
      date: entity.updatedAt,
      sections: [
        { title: 'Summary', body: entity.summary },
        { title: 'Memory Summary', items: memorySummaries.map((item) => truncate(item)) },
        { title: 'Tasks', items: tasks },
        { title: 'Reminders', items: reminders },
        { title: 'Sources', items: relations },
      ],
    });
  }
}

function normalizeFormat(format?: ExportFormat) {
  if (!format) return 'markdown';
  if (format === 'text' || format === 'markdown') return format;
  throw new BadRequestException('format must be text or markdown.');
}

function normalizeDate(input: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) throw new BadRequestException('date must be YYYY-MM-DD.');
  const date = new Date(`${input}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new BadRequestException('date must be valid.');
  return date;
}

function renderExport(format: ExportFormat, input: { title: string; date: Date; sections: ExportSection[] }) {
  const content = format === 'markdown' ? renderMarkdown(input) : renderText(input);
  return { format, content };
}

function renderMarkdown(input: { title: string; date: Date; sections: ExportSection[] }) {
  const parts = [`# ${input.title}`, '', `Date: ${input.date.toISOString()}`];
  for (const section of input.sections) {
    const body = section.body?.trim();
    const items = section.items?.filter((item) => item?.trim()) ?? [];
    if (!body && !items.length) continue;
    parts.push('', `## ${section.title}`);
    if (body) parts.push(body);
    if (items.length) parts.push(...items.map((item) => `- ${item}`));
  }
  return parts.join('\n');
}

function renderText(input: { title: string; date: Date; sections: ExportSection[] }) {
  const parts = [input.title, `Date: ${input.date.toISOString()}`];
  for (const section of input.sections) {
    const body = section.body?.trim();
    const items = section.items?.filter((item) => item?.trim()) ?? [];
    if (!body && !items.length) continue;
    parts.push('', section.title.toUpperCase());
    if (body) parts.push(body);
    if (items.length) parts.push(...items.map((item) => `- ${item}`));
  }
  return parts.join('\n');
}

function formatTask(title: string, dueAt?: Date | null) {
  return dueAt ? `${title} — due ${dueAt.toISOString()}` : title;
}

function truncate(text: string) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  return normalized.length > 260 ? `${normalized.slice(0, 257)}...` : normalized;
}
