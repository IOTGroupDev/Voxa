import { BadRequestException, Injectable } from '@nestjs/common';
import { MemoryHistoryResponse } from '@voxa/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TimelineService {
  constructor(private readonly prisma: PrismaService) {}

  async list(supabaseUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseUserId } });
    if (!user) {
      return [];
    }

    return this.prisma.memoryEvent.findMany({
      where: { userId: user.id },
      orderBy: { occurredAt: 'desc' },
      include: {
        recording: {
          include: {
            transcript: true,
          },
        },
        contextSnapshot: true,
        note: {
          include: {
            actionItems: true,
            reminders: true,
            noteTags: { include: { tag: true } },
          },
        },
        memoryThread: true,
        aiJobs: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async history(
    supabaseUserId: string,
    input: { from: string; to: string; cursor?: string; limit?: number },
  ): Promise<MemoryHistoryResponse> {
    const user = await this.prisma.user.findUnique({ where: { supabaseUserId } });
    if (!user) {
      return { days: [], nextCursor: null, hasAnyMemory: false };
    }

    const from = parseDate(input.from, 'from');
    const to = parseDate(input.to, 'to');
    if (from >= to) {
      throw new BadRequestException('from must be earlier than to.');
    }

    const limit = clampLimit(input.limit);
    const cursorDate = input.cursor ? parseCursor(input.cursor) : null;
    const upperBound = cursorDate && cursorDate < to ? cursorDate : to;
    const where = {
      userId: user.id,
      occurredAt: {
        gte: from,
        lt: upperBound,
      },
    };

    const [events, hasAnyMemory] = await Promise.all([
      this.prisma.memoryEvent.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        take: limit + 1,
        select: {
          id: true,
          recordingId: true,
          type: true,
          occurredAt: true,
          createdAt: true,
          title: true,
          summary: true,
          note: {
            select: {
              title: true,
              summary: true,
              body: true,
            },
          },
        },
      }),
      this.prisma.memoryEvent.findFirst({
        where: { userId: user.id },
        select: { id: true },
      }),
    ]);

    const page = events.slice(0, limit);
    const nextCursor = events.length > limit ? page[page.length - 1]?.occurredAt.toISOString() ?? null : null;
    const byDay = new Map<string, MemoryHistoryResponse['days'][number]>();

    for (const event of page) {
      const date = formatIsoDay(event.occurredAt);
      const day = byDay.get(date) ?? { date, count: 0, memories: [] };
      const title = event.title ?? event.note?.title ?? event.note?.summary ?? event.summary ?? 'Memory';
      const summary = event.summary ?? event.note?.summary ?? event.note?.body ?? null;

      day.count += 1;
      day.memories.push({
        id: event.id,
        recordingId: event.recordingId,
        title,
        type: event.type,
        occurredAt: event.occurredAt.toISOString(),
        createdAt: event.createdAt.toISOString(),
        summary,
      });
      byDay.set(date, day);
    }

    return {
      days: Array.from(byDay.values()),
      nextCursor,
      hasAnyMemory: Boolean(hasAnyMemory),
    };
  }

  async getDailySummary(supabaseUserId: string, date: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseUserId } });
    if (!user) {
      return { date, summary: null };
    }

    const day = new Date(date);
    day.setUTCHours(0, 0, 0, 0);

    const summary = await this.prisma.dailySummary.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: day,
        },
      },
    });

    return summary ?? { date, summary: null };
  }
}

function parseDate(value: string, name: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException(`${name} must use YYYY-MM-DD format.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${name} is not a valid date.`);
  }

  return date;
}

function parseCursor(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('cursor is not a valid ISO date.');
  }

  return date;
}

function clampLimit(value?: number) {
  if (!value || Number.isNaN(value)) return 200;
  return Math.min(Math.max(Math.floor(value), 1), 500);
}

function formatIsoDay(value: Date) {
  return value.toISOString().slice(0, 10);
}
