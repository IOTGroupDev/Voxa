import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateMemoryEventDto, UpdateMemoryEventDto } from '@voxa/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class MemoryEventsService {
  private readonly logger = new Logger(MemoryEventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async create(supabaseUserId: string, email: string | undefined, dto: CreateMemoryEventDto) {
    const user = await this.upsertUser(supabaseUserId, email);
    const contextSnapshot = dto.contextSnapshot
      ? await this.prisma.contextSnapshot.create({
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
        })
      : null;

    return this.prisma.memoryEvent.create({
      data: {
        userId: user.id,
        type: dto.type,
        captureSource: dto.captureSource,
        recordingId: dto.recordingId,
        contextSnapshotId: contextSnapshot?.id,
        occurredAt: new Date(dto.occurredAt),
        buttonGesture: dto.contextSnapshot?.buttonGesture,
      },
      include: {
        contextSnapshot: true,
        recording: true,
        note: true,
      },
    });
  }

  async list(supabaseUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseUserId } });
    if (!user) {
      return [];
    }

    return this.prisma.memoryEvent.findMany({
      where: { userId: user.id },
      orderBy: { occurredAt: 'desc' },
      include: {
        recording: true,
        note: true,
      },
    });
  }

  get(supabaseUserId: string, id: string) {
    return this.findOwnedMemoryEvent(supabaseUserId, id);
  }

  async update(supabaseUserId: string, id: string, dto: UpdateMemoryEventDto) {
    const memoryEvent = await this.findOwnedMemoryEvent(supabaseUserId, id);
    const text = dto.text?.trim();
    const title = text ? createTitle(text) : dto.title;
    const summary = text ?? dto.summary;
    const { text: _text, ...eventDto } = dto;

    return this.prisma.$transaction(async (tx) => {
      const updatedMemoryEvent = await tx.memoryEvent.update({
        where: { id: memoryEvent.id },
        data: {
          ...eventDto,
          ...(title !== undefined ? { title } : {}),
          ...(summary !== undefined ? { summary } : {}),
        },
      });

      if (memoryEvent.noteId && (title !== undefined || summary !== undefined)) {
        await tx.note.update({
          where: { id: memoryEvent.noteId },
          data: {
            ...(title !== undefined ? { title } : {}),
            ...(summary !== undefined ? { summary, body: summary } : {}),
          },
        });
      }

      return updatedMemoryEvent;
    });
  }

  async remove(supabaseUserId: string, id: string) {
    const memoryEvent = await this.findOwnedMemoryEvent(supabaseUserId, id);
    const recordingId = memoryEvent.recordingId;
    const storagePath = memoryEvent.recording?.storagePath;

    this.logger.warn(`Deleting memory event memoryEventId=${memoryEvent.id} recordingId=${recordingId ?? 'none'}`);

    if (storagePath) {
      try {
        await this.storageService.deleteAudioObject(storagePath);
      } catch (error) {
        this.logger.warn(
          `Audio object cleanup skipped memoryEventId=${memoryEvent.id} recordingId=${recordingId ?? 'none'} error=${formatError(error)}`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.memoryEvent.delete({ where: { id: memoryEvent.id } });

      if (recordingId) {
        await tx.recording.delete({ where: { id: recordingId } });
      }
    });

    return { id, recordingId, deleted: true };
  }

  private async findOwnedMemoryEvent(supabaseUserId: string, id: string) {
    const memoryEvent = await this.prisma.memoryEvent.findFirst({
      where: {
        id,
        user: { supabaseUserId },
      },
      include: {
        contextSnapshot: true,
        recording: true,
        note: true,
      },
    });

    if (!memoryEvent) {
      throw new NotFoundException('Memory event not found.');
    }

    return memoryEvent;
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

function formatError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

function createTitle(text: string) {
  const firstSentence = text.split(/[.!?\n]/)[0]?.trim() ?? '';
  const title = firstSentence || 'Captured memory';
  return title.length > 80 ? `${title.slice(0, 77)}...` : title;
}
