import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MemoryService {
  constructor(private readonly prisma: PrismaService) {}

  normalizeTranscript(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
  }

  async attachEventToThread(input: {
    userId: string;
    memoryEventId: string;
    noteId?: string;
    titleHint?: string | null;
  }) {
    const title = this.inferThreadTitle(input.titleHint);
    const now = new Date();

    const thread = await this.prisma.memoryThread.create({
      data: {
        userId: input.userId,
        title,
        description: 'TODO: Replace mock thread assignment with semantic clustering.',
        firstSeenAt: now,
        lastSeenAt: now,
        notesCount: input.noteId ? 1 : 0,
        importanceScore: 0.35,
        unresolvedCount: 0,
        semanticClusterId: this.createSemanticClusterId(title),
      },
    });

    await this.prisma.memoryEvent.update({
      where: { id: input.memoryEventId },
      data: {
        memoryThreadId: thread.id,
        processingStatus: 'thread_attached',
      },
    });

    return thread;
  }

  async updateThreadStatistics(threadId: string) {
    const eventCount = await this.prisma.memoryEvent.count({
      where: { memoryThreadId: threadId },
    });

    return this.prisma.memoryThread.update({
      where: { id: threadId },
      data: {
        notesCount: eventCount,
        lastSeenAt: new Date(),
        importanceScore: Math.min(1, 0.25 + eventCount * 0.1),
      },
    });
  }

  shouldGenerateInsight(input: { eventCount: number; importanceScore: number }): boolean {
    return input.eventCount >= 2 || input.importanceScore >= 0.7;
  }

  private inferThreadTitle(titleHint?: string | null): string {
    if (titleHint?.trim()) {
      return titleHint.trim().slice(0, 80);
    }

    return 'Emerging thought pattern';
  }

  private createSemanticClusterId(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'memory';
  }
}

