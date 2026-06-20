import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  AiProcessingMode,
  AudioRetentionMode,
  PrivacySettingsResponse,
  TranscriptRetentionMode,
  UpdatePrivacySettingsDto,
} from '@voxa/shared';
import { AudioDeletionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async getSettings(supabaseUserId: string, email?: string): Promise<PrivacySettingsResponse> {
    const user = await this.upsertUser(supabaseUserId, email);
    const settings = await this.ensureSettings(user.id);
    const failedDeletion = await this.prisma.audioDeletionLog.findFirst({
      where: { userId: user.id, status: AudioDeletionStatus.failed },
      orderBy: { deletedAt: 'desc' },
    });

    return {
      audioRetentionMode: settings.audioRetentionMode as AudioRetentionMode,
      transcriptRetentionMode: settings.transcriptRetentionMode as TranscriptRetentionMode,
      aiProcessingMode: settings.aiProcessingMode as AiProcessingMode,
      warning: failedDeletion
        ? {
            message: 'Audio deletion failed. Check storage configuration or retry cleanup.',
            recordingId: failedDeletion.recordingId,
            storagePath: failedDeletion.storagePath,
            failedAt: failedDeletion.deletedAt.toISOString(),
          }
        : null,
    };
  }

  async updateSettings(
    supabaseUserId: string,
    email: string | undefined,
    dto: UpdatePrivacySettingsDto,
  ): Promise<PrivacySettingsResponse> {
    this.validateSettings(dto);
    const user = await this.upsertUser(supabaseUserId, email);
    await this.ensureSettings(user.id);

    await this.prisma.userSettings.update({
      where: { userId: user.id },
      data: {
        audioRetentionMode: dto.audioRetentionMode,
        transcriptRetentionMode: dto.transcriptRetentionMode,
        aiProcessingMode: dto.aiProcessingMode,
      },
    });

    return this.getSettings(supabaseUserId, email);
  }

  async applyAudioRetentionAfterProcessing(userId: string, recordingId: string) {
    const settings = await this.ensureSettings(userId);
    const mode = settings.audioRetentionMode as AudioRetentionMode;

    if (mode === AudioRetentionMode.DELETE_AFTER_PROCESSING) {
      return this.deleteAudioForRecording(recordingId, 'delete_after_processing');
    }

    const scheduledAt = getAudioDeletionScheduledAt(mode);
    if (!scheduledAt) {
      await this.prisma.recording.update({
        where: { id: recordingId },
        data: { audioDeletionScheduledAt: null },
      });
      this.logger.log(`Audio retained forever recordingId=${recordingId}`);
      return { status: 'retained', scheduledAt: null };
    }

    await this.prisma.recording.update({
      where: { id: recordingId },
      data: { audioDeletionScheduledAt: scheduledAt },
    });
    this.logger.log(`Audio deletion scheduled recordingId=${recordingId} scheduledAt=${scheduledAt.toISOString()}`);

    return { status: 'scheduled', scheduledAt };
  }

  async cleanupExpiredAudio(recordingId?: string) {
    const now = new Date();
    const recordings = await this.prisma.recording.findMany({
      where: {
        ...(recordingId ? { id: recordingId } : {}),
        audioDeletedAt: null,
        audioDeletionScheduledAt: { lte: now },
      },
      orderBy: { audioDeletionScheduledAt: 'asc' },
      take: recordingId ? 1 : 100,
    });

    let deleted = 0;
    let failed = 0;

    for (const recording of recordings) {
      const result = await this.deleteAudioForRecording(recording.id, 'retention_expired');
      if (result.status === AudioDeletionStatus.deleted || result.status === AudioDeletionStatus.skipped) {
        deleted += 1;
      } else {
        failed += 1;
      }
    }

    return { checked: recordings.length, deleted, failed };
  }

  private async deleteAudioForRecording(recordingId: string, reason: string) {
    const recording = await this.prisma.recording.findUnique({
      where: { id: recordingId },
      select: {
        id: true,
        userId: true,
        storagePath: true,
        audioDeletedAt: true,
      },
    });

    if (!recording) {
      return { status: AudioDeletionStatus.skipped, recordingId, reason, scheduledAt: null };
    }

    if (recording.audioDeletedAt) {
      await this.createDeletionLog({
        userId: recording.userId,
        recordingId: recording.id,
        storagePath: recording.storagePath,
        reason: `${reason}:already_deleted`,
        status: AudioDeletionStatus.skipped,
      });
      return { status: AudioDeletionStatus.skipped, recordingId, reason, scheduledAt: null };
    }

    try {
      await this.storageService.deleteAudioObject(recording.storagePath);
      await this.prisma.$transaction([
        this.prisma.recording.update({
          where: { id: recording.id },
          data: {
            audioDeletedAt: new Date(),
            audioDeletionScheduledAt: null,
          },
        }),
        this.prisma.audioDeletionLog.create({
          data: {
            userId: recording.userId,
            recordingId: recording.id,
            storagePath: recording.storagePath,
            reason,
            status: AudioDeletionStatus.deleted,
          },
        }),
      ]);
      this.logger.log(`Audio retention delete completed recordingId=${recording.id} reason=${reason}`);
      return { status: AudioDeletionStatus.deleted, recordingId: recording.id, reason, scheduledAt: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown audio deletion error';
      await this.createDeletionLog({
        userId: recording.userId,
        recordingId: recording.id,
        storagePath: recording.storagePath,
        reason: `${reason}: ${message}`,
        status: AudioDeletionStatus.failed,
      });
      this.logger.warn(`Audio retention delete failed recordingId=${recording.id} reason=${reason} error=${message}`);
      return {
        status: AudioDeletionStatus.failed,
        recordingId: recording.id,
        reason,
        error: message,
        scheduledAt: null,
      };
    }
  }

  private createDeletionLog(input: {
    userId: string;
    recordingId: string;
    storagePath: string;
    reason: string;
    status: AudioDeletionStatus;
  }) {
    return this.prisma.audioDeletionLog.create({ data: input });
  }

  private async ensureSettings(userId: string) {
    const existing = await this.prisma.userSettings.findUnique({ where: { userId } });
    if (existing) {
      return existing;
    }

    return this.prisma.userSettings.create({
      data: {
        userId,
        audioRetentionMode: AudioRetentionMode.DELETE_AFTER_PROCESSING,
        transcriptRetentionMode: TranscriptRetentionMode.KEEP_FOREVER,
        aiProcessingMode: AiProcessingMode.CLOUD,
      },
    });
  }

  private upsertUser(supabaseUserId: string, email?: string) {
    return this.prisma.user.upsert({
      where: { supabaseUserId },
      update: { email },
      create: { supabaseUserId, email },
    });
  }

  private validateSettings(dto: UpdatePrivacySettingsDto) {
    if (
      dto.audioRetentionMode !== undefined &&
      !Object.values(AudioRetentionMode).includes(dto.audioRetentionMode)
    ) {
      throw new BadRequestException('audioRetentionMode is invalid.');
    }

    if (
      dto.transcriptRetentionMode !== undefined &&
      !Object.values(TranscriptRetentionMode).includes(dto.transcriptRetentionMode)
    ) {
      throw new BadRequestException('transcriptRetentionMode is invalid.');
    }

    if (dto.aiProcessingMode !== undefined && !Object.values(AiProcessingMode).includes(dto.aiProcessingMode)) {
      throw new BadRequestException('aiProcessingMode is invalid.');
    }
  }
}

function getAudioDeletionScheduledAt(mode: AudioRetentionMode) {
  if (mode === AudioRetentionMode.KEEP_7_DAYS) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  if (mode === AudioRetentionMode.KEEP_30_DAYS) {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  return null;
}
