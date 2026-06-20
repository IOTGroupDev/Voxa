import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AiSuggestionStatus, AiSuggestionType } from '@prisma/client';
import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';

type SuggestionStatusInput = 'accepted' | 'dismissed' | 'done';

interface GeneratedSuggestion {
  title: string;
  body: string;
  type: AiSuggestionType;
  sourceIds: string[];
}

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
  ) {}

  async getInbox(supabaseUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseUserId } });
    if (!user) {
      return emptyInbox();
    }

    const [suggestions, unresolvedTasks, failedSyncItems, failedDongleRecordings, reviewMemories] = await Promise.all([
      this.prisma.aiSuggestion.findMany({
        where: { userId: user.id, status: 'pending' },
        orderBy: { createdAt: 'desc' },
        include: {
          relatedEntity: true,
          relatedNote: { include: { actionItems: true, reminders: true } },
          relatedMemoryEvent: {
            include: {
              note: { include: { actionItems: true, reminders: true } },
              memoryThread: true,
              recording: { include: { transcript: true } },
            },
          },
        },
      }),
      this.prisma.actionItem.findMany({
        where: { userId: user.id, completedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { note: true },
      }),
      this.prisma.syncItem.findMany({
        where: { userId: user.id, status: { in: ['failed', 'sync_failed'] } },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
      this.prisma.recording.findMany({
        where: { userId: user.id, dongleSyncStatus: 'sync_failed' },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
      this.prisma.memoryEvent.findMany({
        where: {
          userId: user.id,
          OR: [
            { processingStatus: { contains: 'failed' } },
            { type: 'important', note: null },
          ],
        },
        orderBy: { occurredAt: 'desc' },
        take: 20,
        include: {
          note: { include: { actionItems: true, reminders: true } },
          memoryThread: true,
          recording: { include: { transcript: true } },
        },
      }),
    ]);

    return {
      suggestions,
      unresolvedTasks,
      reminderCandidates: suggestions.filter((suggestion) => suggestion.type === 'reminder_candidate'),
      failedSyncItems: [...failedSyncItems, ...failedDongleRecordings],
      reviewMemories,
    };
  }

  async generateSuggestions(supabaseUserId: string, email?: string) {
    const user = await this.prisma.user.upsert({
      where: { supabaseUserId },
      update: { email },
      create: { supabaseUserId, email },
    });
    const context = await this.buildContext(user.id);
    const { answer } = await this.llmService.generateAnswer({
      question: 'Generate proactive suggestions for the user inbox.',
      context,
      systemPrompt: INBOX_SYSTEM_PROMPT,
    });
    const generated = [
      ...parseSuggestions(answer),
      ...(await this.buildRelationFallbackSuggestions(user.id)),
    ]
      .filter((suggestion) => suggestion.title.length > 3 && suggestion.body.length > 8 && suggestion.sourceIds.length > 0)
      .slice(0, 8);
    const created = [];

    for (const suggestion of generated) {
      const duplicate = await this.findDuplicate(user.id, suggestion);
      if (duplicate) continue;

      const source = await this.resolveSource(user.id, suggestion.sourceIds);
      if (!source.relatedEntityId && !source.relatedNoteId && !source.relatedMemoryEventId) continue;

      created.push(
        await this.prisma.aiSuggestion.create({
          data: {
            userId: user.id,
            title: suggestion.title,
            body: suggestion.body,
            type: suggestion.type,
            ...source,
          },
        }),
      );
    }

    this.logger.log(`Inbox suggestions generated userId=${user.id} requested=${generated.length} created=${created.length}`);
    return this.getInbox(supabaseUserId);
  }

  async updateSuggestionStatus(supabaseUserId: string, id: string, status: SuggestionStatusInput) {
    const suggestion = await this.prisma.aiSuggestion.findFirst({
      where: { id, user: { supabaseUserId } },
    });
    if (!suggestion) {
      throw new NotFoundException('Suggestion not found.');
    }

    return this.prisma.aiSuggestion.update({
      where: { id },
      data: { status },
    });
  }

  private async buildContext(userId: string) {
    const since = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
    const [notes, dailySummaries, openTasks, reminders, entities, relations, threads, insights] = await Promise.all([
      this.prisma.note.findMany({
        where: { userId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 40,
      }),
      this.prisma.dailySummary.findMany({
        where: { userId, date: { gte: since } },
        orderBy: { date: 'desc' },
        take: 14,
      }),
      this.prisma.actionItem.findMany({
        where: { userId, completedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      this.prisma.reminder.findMany({
        where: { userId, dismissedAt: null },
        orderBy: { remindAt: 'asc' },
        take: 30,
      }),
      this.prisma.entity.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 40,
        include: { _count: { select: { mentions: true } } },
      }),
      this.prisma.entityRelation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 60,
        include: { sourceEntity: true, targetEntity: true },
      }),
      this.prisma.memoryThread.findMany({
        where: { userId },
        orderBy: [{ notesCount: 'desc' }, { lastSeenAt: 'desc' }],
        take: 20,
      }),
      this.prisma.insight.findMany({
        where: { userId, type: 'unresolved_question' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return [
      renderContext('Recent notes', notes.map((note) => ({ id: note.id, text: [note.title, note.summary, note.body].filter(Boolean).join(' | ') }))),
      renderContext('Daily summaries', dailySummaries.map((summary) => ({ id: summary.id, text: `${summary.date.toISOString().slice(0, 10)} | ${summary.summary ?? ''}` }))),
      renderContext('Open tasks', openTasks.map((task) => ({ id: task.id, text: [task.title, task.description, task.dueAt ? `due ${task.dueAt.toISOString()}` : null].filter(Boolean).join(' | ') }))),
      renderContext('Reminders', reminders.map((reminder) => ({ id: reminder.id, text: `${reminder.title} | remindAt ${reminder.remindAt.toISOString()}` }))),
      renderContext('Entities', entities.map((entity) => ({ id: entity.id, text: `${entity.name} (${entity.type}) | mentions ${entity._count.mentions} | ${entity.summary ?? ''}` }))),
      renderContext('Entity relations', relations.map((relation) => ({ id: relation.id, text: `${relation.sourceEntity.name} ${relation.relationType} ${relation.targetEntity.name}` }))),
      renderContext('Repeated topics', threads.map((thread) => ({ id: thread.id, text: `${thread.title} | notes ${thread.notesCount} | ${thread.description ?? ''}` }))),
      renderContext('Unresolved questions', insights.map((insight) => ({ id: insight.id, text: `${insight.title} | ${insight.body}` }))),
    ]
      .filter(Boolean)
      .join('\n\n') || 'No user memory context is available.';
  }

  private async findDuplicate(userId: string, suggestion: GeneratedSuggestion) {
    return this.prisma.aiSuggestion.findFirst({
      where: {
        userId,
        type: suggestion.type,
        title: { equals: suggestion.title, mode: 'insensitive' },
        status: { in: [AiSuggestionStatus.pending, AiSuggestionStatus.accepted] },
      },
    });
  }

  private async resolveSource(userId: string, sourceIds: string[]) {
    const ids = [...new Set(sourceIds.filter(Boolean))].slice(0, 8);
    if (!ids.length) return {};

    const [entity, note, memoryEvent] = await Promise.all([
      this.prisma.entity.findFirst({ where: { userId, id: { in: ids } } }),
      this.prisma.note.findFirst({ where: { userId, id: { in: ids } } }),
      this.prisma.memoryEvent.findFirst({ where: { userId, id: { in: ids } } }),
    ]);

    return {
      relatedEntityId: entity?.id,
      relatedNoteId: note?.id,
      relatedMemoryEventId: memoryEvent?.id,
    };
  }

  private async buildRelationFallbackSuggestions(userId: string): Promise<GeneratedSuggestion[]> {
    const relations = await this.prisma.entityRelation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 40,
      include: {
        sourceEntity: { include: { _count: { select: { mentions: true } } } },
        targetEntity: { include: { _count: { select: { mentions: true } } } },
      },
    });

    const suggestions: GeneratedSuggestion[] = [];
    for (const relation of relations) {
      const mentions = relation.sourceEntity._count.mentions + relation.targetEntity._count.mentions;
      if (mentions < 2) continue;

      const nextRelation = relations.find(
        (item) =>
          item.sourceEntityId === relation.targetEntityId &&
          item.targetEntityId !== relation.sourceEntityId &&
          item.relationType !== 'related_to',
      );
      const lastTopic = nextRelation
        ? `${nextRelation.relationType.replace(/_/g, ' ')} ${nextRelation.targetEntity.name}`
        : `${relation.relationType.replace(/_/g, ' ')} ${relation.targetEntity.name}`;

      suggestions.push({
        title: `Continue ${relation.sourceEntity.name} ${relation.targetEntity.name}`,
        body: `You mentioned ${relation.targetEntity.name} several times. Last known topic: ${lastTopic}. Continue from there?`,
        type: AiSuggestionType.continue_project,
        sourceIds: [relation.sourceEntityId, relation.targetEntityId, nextRelation?.targetEntityId].filter(
          (id): id is string => Boolean(id),
        ),
      });

      if (suggestions.length >= 3) break;
    }

    return suggestions;
  }
}

const INBOX_SYSTEM_PROMPT = [
  'You are Voxa.',
  '',
  "Generate proactive suggestions from the user's memory.",
  '',
  'Use only provided memory context.',
  '',
  'Do not invent facts.',
  '',
  'Return only useful suggestions that help the user continue something, close something, review something, or remember something.',
  '',
  'Return JSON only:',
  '',
  '{',
  '  "suggestions": [',
  '    {',
  '      "title": "string",',
  '      "body": "string",',
  '      "type": "follow_up" | "unresolved_task" | "reminder_candidate" | "repeated_topic" | "decision_needed" | "continue_project" | "review_memory",',
  '      "sourceIds": ["string"]',
  '    }',
  '  ]',
  '}',
].join('\n');

function emptyInbox() {
  return {
    suggestions: [],
    unresolvedTasks: [],
    reminderCandidates: [],
    failedSyncItems: [],
    reviewMemories: [],
  };
}

function renderContext(title: string, items: Array<{ id: string; text: string }>) {
  if (!items.length) return '';
  return [`## ${title}`, ...items.map((item) => `- [${item.id}] ${truncate(item.text)}`)].join('\n');
}

function truncate(text: string) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  return normalized.length > 700 ? `${normalized.slice(0, 697)}...` : normalized;
}

function parseSuggestions(answer: string): GeneratedSuggestion[] {
  const cleaned = answer
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  let parsed: { suggestions?: Array<Record<string, unknown>> };
  try {
    parsed = JSON.parse(cleaned) as { suggestions?: Array<Record<string, unknown>> };
  } catch {
    return [];
  }
  const items = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];

  return items.map((item) => ({
    title: typeof item.title === 'string' ? item.title.trim().slice(0, 120) : '',
    body: typeof item.body === 'string' ? item.body.trim().slice(0, 500) : '',
    type: isSuggestionType(item.type) ? item.type : AiSuggestionType.review_memory,
    sourceIds: Array.isArray(item.sourceIds) ? item.sourceIds.filter((id): id is string => typeof id === 'string') : [],
  }));
}

function isSuggestionType(value: unknown): value is AiSuggestionType {
  return typeof value === 'string' && Object.values(AiSuggestionType).includes(value as AiSuggestionType);
}
