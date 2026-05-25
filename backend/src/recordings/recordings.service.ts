import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRecordingDto, UpdateRecordingStatusDto } from '@voxa/shared';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class RecordingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async create(supabaseUserId: string, email: string | undefined, dto: CreateRecordingDto) {
    const user = await this.upsertUser(supabaseUserId, email);
    const recordingId = crypto.randomUUID();

    return this.prisma.recording.create({
      data: {
        id: recordingId,
        userId: user.id,
        deviceId: dto.deviceId,
        captureSource: dto.source,
        storageBucket: 'audio-private',
        storagePath: this.storageService.createAudioUploadPath(supabaseUserId, recordingId),
        mimeType: dto.mimeType,
        durationMs: dto.durationMs,
      },
    });
  }

  async createUploadUrl(supabaseUserId: string, id: string) {
    await this.findOwnedRecording(supabaseUserId, id);
    return this.storageService.createSignedUploadUrl(supabaseUserId, id);
  }

  async updateStatus(supabaseUserId: string, id: string, dto: UpdateRecordingStatusDto) {
    const recording = await this.findOwnedRecording(supabaseUserId, id);

    return this.prisma.recording.update({
      where: { id: recording.id },
      data: {
        status: dto.status,
        uploadedAt: dto.status === 'uploaded' ? new Date() : undefined,
      },
    });
  }

  async list(supabaseUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseUserId } });
    if (!user) {
      return [];
    }

    return this.prisma.recording.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  get(supabaseUserId: string, id: string) {
    return this.findOwnedRecording(supabaseUserId, id);
  }

  async remove(supabaseUserId: string, id: string) {
    const recording = await this.findOwnedRecording(supabaseUserId, id);

    return this.prisma.recording.update({
      where: { id: recording.id },
      data: { status: 'deleted' },
    });
  }

  private async findOwnedRecording(supabaseUserId: string, recordingId: string) {
    const recording = await this.prisma.recording.findFirst({
      where: {
        id: recordingId,
        user: { supabaseUserId },
      },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found.');
    }

    return recording;
  }

  private upsertUser(supabaseUserId: string, email?: string) {
    return this.prisma.user.upsert({
      where: { supabaseUserId },
      update: { email },
      create: { supabaseUserId, email },
    });
  }
}
