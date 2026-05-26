import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DongleRecordingSyncStatus,
  CreateRecordingDto,
  DeviceStatus,
  RegisterDongleRecordingMetadataDto,
  UpdateDongleRecordingSyncStatusDto,
  UpdateRecordingStatusDto,
} from '@voxa/shared';
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

  async registerDongleMetadata(
    supabaseUserId: string,
    email: string | undefined,
    dto: RegisterDongleRecordingMetadataDto,
  ) {
    this.validateDongleMetadata(dto);
    const user = await this.upsertUser(supabaseUserId, email);
    const device = await this.findOwnedDeviceByHardwareId(user.id, dto.deviceId);
    const recordingId = crypto.randomUUID();
    const deviceCreatedAt = new Date(dto.createdAtDeviceTime);
    const uniqueDeviceRecording = {
      deviceId: device.id,
      deviceLocalRecordingId: dto.localRecordingId,
    };
    const existingRecording = await this.prisma.recording.findUnique({
      where: {
        deviceId_deviceLocalRecordingId: uniqueDeviceRecording,
      },
    });

    if (existingRecording) {
      return this.prisma.recording.update({
        where: { id: existingRecording.id },
        data: {
          durationMs: dto.durationMs,
          sizeBytes: dto.byteSize,
          dongleSyncStatus: existingRecording.dongleSyncStatus ?? DongleRecordingSyncStatus.METADATA_SYNCED,
          deviceCreatedAt,
          deviceDurationMs: dto.durationMs,
          deviceAudioCodec: dto.codec,
          deviceChecksum: dto.checksum,
        },
      });
    }

    return this.prisma.recording.create({
      data: {
        id: recordingId,
        userId: user.id,
        deviceId: device.id,
        captureSource: 'dongle',
        status: 'created',
        storageBucket: 'audio-private',
        storagePath: this.storageService.createAudioUploadPath(supabaseUserId, recordingId),
        mimeType: `audio/${dto.codec}`,
        durationMs: dto.durationMs,
        sizeBytes: dto.byteSize,
        deviceLocalRecordingId: dto.localRecordingId,
        originalDeviceId: dto.deviceId,
        capturedOffline: true,
        dongleSyncStatus: DongleRecordingSyncStatus.METADATA_SYNCED,
        deviceCreatedAt,
        deviceDurationMs: dto.durationMs,
        deviceAudioCodec: dto.codec,
        deviceChecksum: dto.checksum,
      },
    });
  }

  async updateDongleSyncStatus(supabaseUserId: string, dto: UpdateDongleRecordingSyncStatusDto) {
    this.validateDongleSyncStatus(dto);
    const user = await this.prisma.user.findUnique({ where: { supabaseUserId } });
    if (!user) {
      throw new NotFoundException('Recording not found.');
    }

    const device = await this.findOwnedDeviceByHardwareId(user.id, dto.deviceId);
    const recording = await this.prisma.recording.findUnique({
      where: {
        deviceId_deviceLocalRecordingId: {
          deviceId: device.id,
          deviceLocalRecordingId: dto.localRecordingId,
        },
      },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found.');
    }

    return this.prisma.recording.update({
      where: { id: recording.id },
      data: {
        dongleSyncStatus: dto.syncStatus,
        uploadedAt:
          dto.syncStatus === DongleRecordingSyncStatus.UPLOADED_TO_BACKEND ||
          dto.syncStatus === DongleRecordingSyncStatus.CONFIRMED_BY_BACKEND
            ? new Date()
            : undefined,
      },
    });
  }

  async listDongleRecordings(supabaseUserId: string, deviceHardwareId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseUserId } });
    if (!user) {
      return [];
    }

    const device = await this.findOwnedDeviceByHardwareId(user.id, deviceHardwareId);

    return this.prisma.recording.findMany({
      where: {
        userId: user.id,
        deviceId: device.id,
        capturedOffline: true,
      },
      orderBy: { deviceCreatedAt: 'desc' },
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

  private async findOwnedDeviceByHardwareId(userId: string, hardwareId: string) {
    const device = await this.prisma.device.findFirst({
      where: {
        userId,
        hardwareId,
        status: DeviceStatus.ACTIVE,
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found.');
    }

    return device;
  }

  private validateDongleMetadata(dto: RegisterDongleRecordingMetadataDto) {
    this.requireNonEmptyString(dto.deviceId, 'deviceId');
    this.requireNonEmptyString(dto.localRecordingId, 'localRecordingId');
    this.requireNonEmptyString(dto.codec, 'codec');
    this.requireNonEmptyString(dto.checksum, 'checksum');

    if (!Number.isInteger(dto.durationMs) || dto.durationMs <= 0) {
      throw new BadRequestException('durationMs must be a positive integer.');
    }

    if (!Number.isInteger(dto.byteSize) || dto.byteSize <= 0) {
      throw new BadRequestException('byteSize must be a positive integer.');
    }

    if (!Number.isInteger(dto.sampleRate) || dto.sampleRate <= 0) {
      throw new BadRequestException('sampleRate must be a positive integer.');
    }

    const deviceCreatedAt = new Date(dto.createdAtDeviceTime);
    if (Number.isNaN(deviceCreatedAt.getTime())) {
      throw new BadRequestException('createdAtDeviceTime must be a valid ISO date.');
    }
  }

  private validateDongleSyncStatus(dto: UpdateDongleRecordingSyncStatusDto) {
    this.requireNonEmptyString(dto.deviceId, 'deviceId');
    this.requireNonEmptyString(dto.localRecordingId, 'localRecordingId');

    if (!Object.values(DongleRecordingSyncStatus).includes(dto.syncStatus)) {
      throw new BadRequestException('syncStatus is invalid.');
    }
  }

  private requireNonEmptyString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${fieldName} must be a non-empty string.`);
    }
  }
}
