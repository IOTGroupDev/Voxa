import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async reprocessRecording(supabaseUserId: string, recordingId: string) {
    const recording = await this.prisma.recording.findFirst({
      where: {
        id: recordingId,
        user: { supabaseUserId },
      },
      include: { memoryEvent: true },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found.');
    }

    if (!recording.memoryEvent) {
      throw new BadRequestException('Recording has no MemoryEvent to reprocess.');
    }

    const aiJob = await this.prisma.aiJob.create({
      data: {
        userId: recording.userId,
        recordingId: recording.id,
        memoryEventId: recording.memoryEvent.id,
        type: 'transcription',
        status: 'pending',
        payload: {
          source: 'manual_reprocess_recording',
        },
      },
    });

    const queuedJob = await this.queueService.enqueueRecordingUploaded({
      aiJobId: aiJob.id,
      recordingId: recording.id,
      memoryEventId: recording.memoryEvent.id,
      userId: recording.userId,
    });

    return { aiJob, queuedJob };
  }

  async reprocessEvent(supabaseUserId: string, eventId: string) {
    const memoryEvent = await this.prisma.memoryEvent.findFirst({
      where: {
        id: eventId,
        user: { supabaseUserId },
      },
    });

    if (!memoryEvent) {
      throw new NotFoundException('Memory event not found.');
    }

    if (!memoryEvent.recordingId) {
      throw new BadRequestException('Memory event has no recording to reprocess.');
    }

    const aiJob = await this.prisma.aiJob.create({
      data: {
        userId: memoryEvent.userId,
        recordingId: memoryEvent.recordingId,
        memoryEventId: memoryEvent.id,
        type: 'summary',
        status: 'pending',
        payload: {
          source: 'manual_reprocess_event',
        },
      },
    });

    const queuedJob = await this.queueService.enqueueSummary({
      aiJobId: aiJob.id,
      recordingId: memoryEvent.recordingId,
      memoryEventId: memoryEvent.id,
      userId: memoryEvent.userId,
    });

    return { aiJob, queuedJob };
  }
}
