import { Injectable } from '@nestjs/common';
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
      },
    });
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
