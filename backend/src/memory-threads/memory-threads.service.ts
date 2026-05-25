import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MemoryThreadsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(supabaseUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseUserId } });
    if (!user) {
      return [];
    }

    return this.prisma.memoryThread.findMany({
      where: { userId: user.id },
      orderBy: [{ importanceScore: 'desc' }, { lastSeenAt: 'desc' }],
      include: {
        memoryEvents: {
          orderBy: { occurredAt: 'desc' },
          take: 5,
          include: { note: true },
        },
        insights: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
    });
  }

  async get(supabaseUserId: string, id: string) {
    const thread = await this.prisma.memoryThread.findFirst({
      where: {
        id,
        user: { supabaseUserId },
      },
      include: {
        memoryEvents: {
          orderBy: { occurredAt: 'desc' },
          include: { note: true, recording: true },
        },
        insights: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!thread) {
      throw new NotFoundException('Memory thread not found.');
    }

    return thread;
  }
}

