import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  ButtonGesture,
  CompleteCaptureSessionDto,
  CaptureSource,
  CreateCaptureSessionDto,
  MemoryEventType,
} from '@voxa/shared';
import { Prisma } from '@prisma/client';
import {
  assertEnumValue,
  assertIsoDateString,
  assertOptionalEnumValue,
  assertOptionalNonNegativeInteger,
  assertOptionalNumber,
  assertOptionalString,
  assertPlainObject,
  assertRequiredString,
} from '../common/body-validation';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class CaptureService {
  private readonly logger = new Logger(CaptureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async createSession(supabaseUserId: string, email: string | undefined, dto: CreateCaptureSessionDto) {
    this.validateCreateSession(dto);
    const user = await this.upsertUser(supabaseUserId, email);
    this.logger.log(
      `Creating capture session userId=${user.id} source=${dto.source} deviceId=${dto.deviceId ?? 'none'}`,
    );

    const contextSnapshot = await this.prisma.contextSnapshot.create({
      data: {
        userId: user.id,
        timestamp: new Date(dto.contextSnapshot.timestamp),
        timezone: dto.contextSnapshot.timezone,
        location: this.toJson(dto.contextSnapshot.location),
        calendarContext: this.toJson(dto.contextSnapshot.calendarContext),
        deviceState: this.toJson(dto.contextSnapshot.deviceState),
        appState: this.toJson(dto.contextSnapshot.appState),
        captureSource: dto.contextSnapshot.captureSource,
        buttonGesture: dto.contextSnapshot.buttonGesture,
        nearbyDeviceId: dto.contextSnapshot.nearbyDeviceId,
        userSelectedProject: dto.contextSnapshot.userSelectedProject,
      },
    });

    const captureSession = await this.prisma.captureSession.create({
      data: {
        userId: user.id,
        deviceId: dto.deviceId,
        source: dto.source,
        buttonGesture: dto.buttonGesture,
        contextSnapshotId: contextSnapshot.id,
      },
      include: { contextSnapshot: true },
    });
    this.logger.log(
      `Capture session created sessionId=${captureSession.id} userId=${user.id} contextSnapshotId=${contextSnapshot.id}`,
    );
    return captureSession;
  }

  async completeSession(supabaseUserId: string, id: string, dto: CompleteCaptureSessionDto) {
    this.validateCompleteSession(dto);
    const captureSession = await this.findOwnedSession(supabaseUserId, id);
    this.logger.log(
      `Completing capture session sessionId=${captureSession.id} recordingId=${dto.recordingId}`,
    );
    const recording = await this.prisma.recording.findFirst({
      where: {
        id: dto.recordingId,
        user: { supabaseUserId },
      },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found.');
    }

    const { memoryEvent, updatedSession, aiJob } = await this.prisma.$transaction(async (tx) => {
      const memoryEvent = await tx.memoryEvent.create({
        data: {
          userId: captureSession.userId,
          deviceId: captureSession.deviceId,
          recordingId: recording.id,
          contextSnapshotId: captureSession.contextSnapshotId,
          type: this.mapGestureToEventType(captureSession.buttonGesture),
          captureSource: captureSession.source,
          buttonGesture: captureSession.buttonGesture,
          occurredAt: captureSession.startedAt,
        },
      });

      const updatedSession = await tx.captureSession.update({
        where: { id: captureSession.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          recordingId: recording.id,
        },
        include: {
          contextSnapshot: true,
          recording: true,
        },
      });

      await tx.recording.update({
        where: { id: recording.id },
        data: {
          durationMs: dto.durationMs,
          status: 'uploaded',
          uploadedAt: new Date(),
        },
      });

      const aiJob = await tx.aiJob.create({
        data: {
          userId: captureSession.userId,
          recordingId: recording.id,
          memoryEventId: memoryEvent.id,
          type: 'transcription',
          status: 'pending',
          payload: this.toJson({
            source: 'capture_session_completed',
            captureSessionId: captureSession.id,
          }),
        },
      });

      return { memoryEvent, updatedSession, aiJob };
    });

    const queuedJob = await this.queueService.enqueueRecordingUploaded({
      aiJobId: aiJob.id,
      recordingId: recording.id,
      memoryEventId: memoryEvent.id,
      userId: captureSession.userId,
    });
    this.logger.log(
      `Capture session completed sessionId=${updatedSession.id} memoryEventId=${memoryEvent.id} aiJobId=${aiJob.id} queueJobId=${queuedJob.jobId}`,
    );

    return { captureSession: updatedSession, memoryEvent, aiJob, queuedJob };
  }

  async cancelSession(supabaseUserId: string, id: string) {
    const captureSession = await this.findOwnedSession(supabaseUserId, id);
    this.logger.warn(`Cancelling capture session sessionId=${captureSession.id}`);

    return this.prisma.captureSession.update({
      where: { id: captureSession.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });
  }

  private async findOwnedSession(supabaseUserId: string, sessionId: string) {
    const captureSession = await this.prisma.captureSession.findFirst({
      where: {
        id: sessionId,
        user: { supabaseUserId },
      },
    });

    if (!captureSession) {
      throw new NotFoundException('Capture session not found.');
    }

    return captureSession;
  }

  private mapGestureToEventType(buttonGesture?: string | null): MemoryEventType {
    if (buttonGesture === 'double_press') {
      return MemoryEventType.TASK;
    }

    if (buttonGesture === 'long_press') {
      return MemoryEventType.IMPORTANT;
    }

    if (buttonGesture === 'press_and_hold') {
      return MemoryEventType.QUICK_NOTE;
    }

    return MemoryEventType.QUICK_NOTE;
  }

  private upsertUser(supabaseUserId: string, email?: string) {
    return this.prisma.user.upsert({
      where: { supabaseUserId },
      update: { email },
      create: { supabaseUserId, email },
    });
  }

  private toJson(value: unknown): Prisma.InputJsonValue | undefined {
    return value === undefined ? undefined : (value as Prisma.InputJsonValue);
  }

  private validateCreateSession(dto: CreateCaptureSessionDto) {
    assertPlainObject(dto, 'CreateCaptureSessionDto');
    assertEnumValue(CaptureSource, dto.source, 'source');
    assertOptionalEnumValue(ButtonGesture, dto.buttonGesture, 'buttonGesture');
    assertOptionalString(dto.deviceId, 'deviceId');
    assertPlainObject(dto.contextSnapshot, 'contextSnapshot');
    assertIsoDateString(dto.contextSnapshot.timestamp, 'contextSnapshot.timestamp');
    assertRequiredString(dto.contextSnapshot.timezone, 'contextSnapshot.timezone');
    assertEnumValue(CaptureSource, dto.contextSnapshot.captureSource, 'contextSnapshot.captureSource');
    assertOptionalEnumValue(ButtonGesture, dto.contextSnapshot.buttonGesture, 'contextSnapshot.buttonGesture');
    assertOptionalString(dto.contextSnapshot.nearbyDeviceId, 'contextSnapshot.nearbyDeviceId');
    assertOptionalString(dto.contextSnapshot.userSelectedProject, 'contextSnapshot.userSelectedProject');

    if (dto.contextSnapshot.location !== undefined) {
      assertPlainObject(dto.contextSnapshot.location, 'contextSnapshot.location');
      assertOptionalNumber(dto.contextSnapshot.location.accuracyMeters, 'contextSnapshot.location.accuracyMeters');
      if (!Number.isFinite(dto.contextSnapshot.location.latitude)) {
        throw new BadRequestException('contextSnapshot.location.latitude must be a number.');
      }
      if (!Number.isFinite(dto.contextSnapshot.location.longitude)) {
        throw new BadRequestException('contextSnapshot.location.longitude must be a number.');
      }
    }
  }

  private validateCompleteSession(dto: CompleteCaptureSessionDto) {
    assertPlainObject(dto, 'CompleteCaptureSessionDto');
    assertRequiredString(dto.recordingId, 'recordingId');
    assertOptionalNonNegativeInteger(dto.durationMs, 'durationMs');
  }
}
