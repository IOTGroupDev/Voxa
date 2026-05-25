import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMemoryEventDto, UpdateMemoryEventDto } from '@voxa/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MemoryEventsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.memoryEvent.update({
      where: { id: memoryEvent.id },
      data: dto,
    });
  }

  async remove(supabaseUserId: string, id: string) {
    const memoryEvent = await this.findOwnedMemoryEvent(supabaseUserId, id);

    await this.prisma.memoryEvent.delete({ where: { id: memoryEvent.id } });
    return { id, deleted: true };
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
