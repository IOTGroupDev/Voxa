import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CompleteCaptureSessionDto,
  CreateCaptureSessionDto,
  MemoryEventType,
} from '@voxa/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CaptureService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(supabaseUserId: string, email: string | undefined, dto: CreateCaptureSessionDto) {
    const user = await this.upsertUser(supabaseUserId, email);

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

    return this.prisma.captureSession.create({
      data: {
        userId: user.id,
        deviceId: dto.deviceId,
        source: dto.source,
        buttonGesture: dto.buttonGesture,
        contextSnapshotId: contextSnapshot.id,
      },
      include: { contextSnapshot: true },
    });
  }

  async completeSession(supabaseUserId: string, id: string, dto: CompleteCaptureSessionDto) {
    const captureSession = await this.findOwnedSession(supabaseUserId, id);
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

    // TODO: Enqueue recording_uploaded with BullMQ once QueueService is fully wired.
    return { captureSession: updatedSession, memoryEvent };
  }

  async cancelSession(supabaseUserId: string, id: string) {
    const captureSession = await this.findOwnedSession(supabaseUserId, id);

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
