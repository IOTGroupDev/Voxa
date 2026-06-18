import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@voxa/shared';
import { Job } from 'bullmq';
import { MemoryService } from '../ai/memory.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiPipelineJobData } from './transcription.worker';

type InsightJobData = AiPipelineJobData & { memoryThreadId: string };

@Injectable()
@Processor(QUEUE_NAMES.INSIGHT)
export class InsightWorker extends WorkerHost {
  private readonly logger = new Logger(InsightWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly memoryService: MemoryService,
  ) {
    super();
  }

  async process(job: Job<InsightJobData>) {
    const { aiJobId, memoryThreadId, userId } = job.data;
    this.logger.log(
      `Insight started queueJobId=${job.id} aiJobId=${aiJobId} memoryThreadId=${memoryThreadId}`,
    );

    await this.prisma.aiJob.update({
      where: { id: aiJobId },
      data: { status: 'processing', startedAt: new Date(), attempts: { increment: 1 } },
    });

    const thread = await this.prisma.memoryThread.findUniqueOrThrow({
      where: { id: memoryThreadId },
      include: {
        memoryEvents: {
          include: { note: true },
          orderBy: { occurredAt: 'desc' },
          take: 5,
        },
      },
    });

    const shouldGenerate = this.memoryService.shouldGenerateInsight({
      eventCount: thread.memoryEvents.length,
      importanceScore: thread.importanceScore,
    });

    const insight = shouldGenerate
      ? await this.prisma.insight.create({
          data: {
            userId,
            type: 'recurring_theme',
            title: 'A thought pattern is forming',
            body: `You returned to "${thread.title}" more than once. This may be worth revisiting calmly.`,
            relatedThreadId: thread.id,
            relatedNoteIds: thread.memoryEvents.map((event) => event.note?.id).filter(Boolean) as string[],
            importanceScore: thread.importanceScore,
          },
        })
      : null;

    const completedJob = await this.prisma.aiJob.update({
      where: { id: aiJobId },
      data: { status: 'completed', completedAt: new Date() },
    });
    this.logger.log(
      `Insight completed queueJobId=${job.id} aiJobId=${completedJob.id} memoryThreadId=${memoryThreadId} insightId=${insight?.id ?? 'none'} generated=${Boolean(insight)}`,
    );

    return { insightId: insight?.id ?? null, aiJobId: completedJob.id };
  }
}
