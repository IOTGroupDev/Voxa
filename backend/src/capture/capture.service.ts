import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  CompleteCaptureSessionDto,
  CreateCaptureSessionDto,
  MemoryEventType,
} from '@voxa/shared';
import { Prisma } from '@prisma/client';
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

    const memoryEvent = await this.prisma.memoryEvent.create({
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

    const updatedSession = await this.prisma.captureSession.update({
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

    await this.prisma.recording.update({
      where: { id: recording.id },
      data: {
        durationMs: dto.durationMs,
        status: 'uploaded',
        uploadedAt: new Date(),
      },
    });

    const aiJob = await this.prisma.aiJob.create({
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
}
