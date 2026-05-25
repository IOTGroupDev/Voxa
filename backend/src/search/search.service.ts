import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(supabaseUserId: string, query: string) {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return { query, results: [] };
    }

    const user = await this.prisma.user.findUnique({ where: { supabaseUserId } });
    if (!user) {
      return { query, results: [] };
    }

    const [notes, memoryEvents, memoryThreads, insights] = await Promise.all([
      this.prisma.note.findMany({
        where: {
          userId: user.id,
          OR: [
            { title: { contains: trimmedQuery, mode: 'insensitive' } },
            { summary: { contains: trimmedQuery, mode: 'insensitive' } },
            { body: { contains: trimmedQuery, mode: 'insensitive' } },
          ],
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.memoryEvent.findMany({
        where: {
          userId: user.id,
          OR: [
            { title: { contains: trimmedQuery, mode: 'insensitive' } },
            { summary: { contains: trimmedQuery, mode: 'insensitive' } },
          ],
        },
        take: 20,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.memoryThread.findMany({
        where: {
          userId: user.id,
          OR: [
            { title: { contains: trimmedQuery, mode: 'insensitive' } },
            { description: { contains: trimmedQuery, mode: 'insensitive' } },
          ],
        },
        take: 20,
        orderBy: [{ importanceScore: 'desc' }, { lastSeenAt: 'desc' }],
      }),
      this.prisma.insight.findMany({
        where: {
          userId: user.id,
          OR: [
            { title: { contains: trimmedQuery, mode: 'insensitive' } },
            { body: { contains: trimmedQuery, mode: 'insensitive' } },
          ],
        },
        take: 20,
        orderBy: [{ importanceScore: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    return {
      query,
      results: [
        ...notes.map((note) => ({ type: 'note' as const, item: note })),
        ...memoryEvents.map((memoryEvent) => ({ type: 'memory_event' as const, item: memoryEvent })),
        ...memoryThreads.map((memoryThread) => ({ type: 'memory_thread' as const, item: memoryThread })),
        ...insights.map((insight) => ({ type: 'insight' as const, item: insight })),
      ],
    };
  }
}
