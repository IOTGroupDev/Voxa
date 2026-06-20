import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@voxa/shared';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { normalizeVoiceText, parseVoiceCommand } from '../ai/voice-command';
import { EntitiesService } from '../entities/entities.service';
import { PrivacyService } from '../privacy/privacy.service';
import { AiPipelineJobData } from './transcription.worker';

@Injectable()
@Processor(QUEUE_NAMES.SUMMARY)
export class SummaryWorker extends WorkerHost {
  private readonly logger = new Logger(SummaryWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly entitiesService: EntitiesService,
    private readonly privacyService: PrivacyService,
  ) {
    super();
  }

  async process(job: Job<AiPipelineJobData>) {
    const { aiJobId, recordingId, memoryEventId, userId } = job.data;
    this.logger.log(
      `Summary started queueJobId=${job.id} aiJobId=${aiJobId} recordingId=${recordingId} memoryEventId=${memoryEventId}`,
    );
    await this.markProcessing(aiJobId);
    const transcript = await this.prisma.transcript.findUnique({
      where: { recordingId },
    });
    const body = normalizeText(transcript?.text ?? '');
    const voiceCommand = parseVoiceCommand(body);
    const noteBody = voiceCommand?.content ?? body;
    const title = createTitle(noteBody);
    const summary = createSummary(noteBody);

    if (voiceCommand) {
      this.logger.log(
        `Voice command detected queueJobId=${job.id} memoryEventId=${memoryEventId} kind=${voiceCommand.kind}`,
      );
    }

    const note = await this.prisma.note.upsert({
      where: { memoryEventId },
      update: {
        title,
        summary,
        body: noteBody,
      },
      create: {
        userId,
        memoryEventId,
        title,
        summary,
        body: noteBody,
      },
    });

    await this.prisma.memoryEvent.update({
      where: { id: memoryEventId },
      data: {
        ...(voiceCommand ? { type: voiceCommand.eventType } : {}),
        noteId: note.id,
        title: note.title,
        summary: note.summary,
        processingStatus: 'summary_created',
      },
    });

    const commandResult = voiceCommand
      ? await this.applyVoiceCommand({
          userId,
          noteId: note.id,
          kind: voiceCommand.kind,
          reminder: voiceCommand.reminder,
          title,
          body: noteBody,
        })
      : null;

    await this.entitiesService.extractAndLink({
      userId,
      noteId: note.id,
      transcriptId: transcript?.id,
      memoryEventId,
      recordingId,
      text: [note.title, note.summary, note.body, transcript?.text].filter(Boolean).join('\n'),
    });

    const retentionResult = await this.privacyService.applyAudioRetentionAfterProcessing(userId, recordingId);
    if (retentionResult.scheduledAt) {
      await this.queueService.enqueueCleanup({
        recordingId,
        reason: 'audio_retention',
        runAt: retentionResult.scheduledAt,
      });
    }

    const completedJob = await this.markCompleted(aiJobId);
    const timelineJob = await this.createAiJob(userId, recordingId, memoryEventId, 'timeline_update', {
      noteId: note.id,
    });
    const queuedJob = await this.queueService.enqueueTimelineUpdate({
      aiJobId: timelineJob.id,
      recordingId,
      memoryEventId,
      userId,
      noteId: note.id,
    });
    this.logger.log(
      `Summary completed queueJobId=${job.id} aiJobId=${completedJob.id} noteId=${note.id} voiceCommand=${voiceCommand?.kind ?? 'none'} actionItemId=${commandResult?.actionItemId ?? 'none'} reminderId=${commandResult?.reminderId ?? 'none'} nextQueueJobId=${queuedJob.jobId}`,
    );

    return { noteId: note.id, aiJobId: completedJob.id, queuedJob };
  }

  private markProcessing(aiJobId: string) {
    return this.prisma.aiJob.update({
      where: { id: aiJobId },
      data: { status: 'processing', startedAt: new Date(), attempts: { increment: 1 } },
    });
  }

  private markCompleted(aiJobId: string) {
    return this.prisma.aiJob.update({
      where: { id: aiJobId },
      data: { status: 'completed', completedAt: new Date() },
    });
  }

  private createAiJob(
    userId: string,
    recordingId: string,
    memoryEventId: string,
    type: 'timeline_update',
    payload: Record<string, string>,
  ) {
    return this.prisma.aiJob.create({
      data: { userId, recordingId, memoryEventId, type, status: 'pending', payload },
    });
  }

  private async applyVoiceCommand(input: {
    userId: string;
    noteId: string;
    kind: 'note' | 'idea' | 'task' | 'reminder';
    title: string;
    body: string;
    reminder?: { title: string; remindAt: Date };
  }) {
    if (input.kind === 'task') {
      const existing = await this.prisma.actionItem.findFirst({
        where: {
          noteId: input.noteId,
          source: 'voice_command',
        },
      });
      const action = existing ?? await this.prisma.actionItem.create({
        data: {
          userId: input.userId,
          noteId: input.noteId,
          title: input.title || input.body,
          source: 'voice_command',
        },
      });

      return { actionItemId: action.id, reminderId: null };
    }

    if (input.kind === 'reminder') {
      const existing = await this.prisma.reminder.findFirst({
        where: {
          noteId: input.noteId,
          source: 'voice_command',
        },
      });
      const reminder = existing ?? await this.prisma.reminder.create({
        data: {
          userId: input.userId,
          noteId: input.noteId,
          title: input.reminder?.title ?? input.title,
          remindAt: input.reminder?.remindAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
          source: 'voice_command',
        },
      });

      return { actionItemId: null, reminderId: reminder.id };
    }

    return { actionItemId: null, reminderId: null };
  }
}

function normalizeText(text: string) {
  const normalized = normalizeVoiceText(text);
  return normalized.length > 0 ? normalized : 'Audio captured without transcript text.';
}

function createTitle(text: string) {
  const firstSentence = text.split(/[.!?\n]/)[0]?.trim() ?? '';
  const title = firstSentence || 'Captured memory';
  return title.length > 80 ? `${title.slice(0, 77)}...` : title;
}

function createSummary(text: string) {
  return text.length > 240 ? `${text.slice(0, 237)}...` : text;
}
