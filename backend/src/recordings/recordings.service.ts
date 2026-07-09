import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  CaptureSource,
  DongleRecordingSyncStatus,
  CreateRecordingDto,
  DeviceStatus,
  RecordingStatus,
  RegisterDongleRecordingMetadataDto,
  UpdateDongleRecordingSyncStatusDto,
  UpdateRecordingStatusDto,
} from '@voxa/shared';
import {
  assertEnumValue,
  assertOptionalNonNegativeInteger,
  assertOptionalString,
  assertPlainObject,
  assertRequiredString,
} from '../common/body-validation';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class RecordingsService {
  private readonly logger = new Logger(RecordingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async create(supabaseUserId: string, email: string | undefined, dto: CreateRecordingDto) {
    this.validateCreateRecording(dto);
    const user = await this.upsertUser(supabaseUserId, email);
    const recordingId = crypto.randomUUID();
    this.logger.log(
      `Creating recording recordingId=${recordingId} userId=${user.id} source=${dto.source} deviceId=${dto.deviceId ?? 'none'} mimeType=${dto.mimeType}`,
    );

    const recording = await this.prisma.recording.create({
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
    this.logger.log(`Recording created recordingId=${recording.id} storagePath=${recording.storagePath}`);
    return recording;
  }

  async createUploadUrl(supabaseUserId: string, id: string) {
    await this.findOwnedRecording(supabaseUserId, id);
    this.logger.log(`Creating upload URL recordingId=${id}`);
    return this.storageService.createSignedUploadUrl(supabaseUserId, id);
  }

  async updateStatus(supabaseUserId: string, id: string, dto: UpdateRecordingStatusDto) {
    this.validateUpdateStatus(dto);
    const recording = await this.findOwnedRecording(supabaseUserId, id);
    this.logger.log(`Updating recording status recordingId=${recording.id} status=${dto.status}`);

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
      this.logger.log(
        `Updating dongle recording metadata recordingId=${existingRecording.id} deviceId=${device.id} localRecordingId=${dto.localRecordingId}`,
      );
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

    this.logger.log(
      `Registering dongle recording metadata recordingId=${recordingId} deviceId=${device.id} localRecordingId=${dto.localRecordingId}`,
    );
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

    this.logger.log(
      `Updating dongle sync status recordingId=${recording.id} deviceId=${device.id} localRecordingId=${dto.localRecordingId} status=${dto.syncStatus}`,
    );
    const [updatedRecording] = await this.prisma.$transaction([
      this.prisma.recording.update({
        where: { id: recording.id },
        data: {
          dongleSyncStatus: dto.syncStatus,
          uploadedAt:
            dto.syncStatus === DongleRecordingSyncStatus.UPLOADED_TO_BACKEND ||
            dto.syncStatus === DongleRecordingSyncStatus.CONFIRMED_BY_BACKEND
              ? new Date()
              : undefined,
        },
      }),
      this.prisma.device.update({
        where: { id: device.id },
        data: {
          status: mapDongleSyncToDeviceStatus(dto.syncStatus),
          lastSeenAt: new Date(),
        },
      }),
    ]);

    return updatedRecording;
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

  async getResult(supabaseUserId: string, id: string) {
    const recording = await this.prisma.recording.findFirst({
      where: {
        user: { supabaseUserId },
        OR: [{ id }, { captureSession: { id } }],
      },
      include: {
        captureSession: true,
        transcript: true,
        aiJobs: {
          orderBy: { createdAt: 'asc' },
        },
        memoryEvent: {
          include: {
            memoryThread: true,
            note: {
              include: {
                actionItems: true,
                reminders: true,
              },
            },
          },
        },
      },
    });

    if (!recording) {
      throw new NotFoundException('Recording result not found.');
    }

    const note = recording.memoryEvent?.note ?? null;
    const status = describeResultStatus(recording);
    const detectedType = detectResultType(recording.memoryEvent?.type, note?.actionItems ?? [], note?.reminders ?? []);
    const error = getResultError(recording);

    return {
      id: recording.id,
      recordingId: recording.id,
      captureSessionId: recording.captureSession?.id ?? null,
      status,
      error,
      errorMessage: error,
      detectedType,
      summary: note?.summary ?? recording.memoryEvent?.summary ?? null,
      transcript: recording.transcript?.text ?? null,
      note,
      tasks: note?.actionItems ?? [],
      reminders: note?.reminders ?? [],
      memoryEvent: recording.memoryEvent,
      relatedTopics: recording.memoryEvent?.memoryThread ? [recording.memoryEvent.memoryThread] : [],
      recording: {
        id: recording.id,
        status: recording.status,
        captureSource: recording.captureSource,
        durationMs: recording.durationMs,
        mimeType: recording.mimeType,
        createdAt: recording.createdAt,
        updatedAt: recording.updatedAt,
      },
      aiJobs: recording.aiJobs,
      createdAt: recording.createdAt,
      updatedAt: recording.updatedAt,
    };
  }

  async remove(supabaseUserId: string, id: string) {
    const recording = await this.findOwnedRecording(supabaseUserId, id);
    this.logger.warn(`Marking recording deleted recordingId=${recording.id}`);

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
        status: { in: [DeviceStatus.PAIRED, DeviceStatus.SYNCING] },
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found.');
    }

    return device;
  }

  private validateDongleMetadata(dto: RegisterDongleRecordingMetadataDto) {
    assertPlainObject(dto, 'RegisterDongleRecordingMetadataDto');
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
    assertPlainObject(dto, 'UpdateDongleRecordingSyncStatusDto');
    this.requireNonEmptyString(dto.deviceId, 'deviceId');
    this.requireNonEmptyString(dto.localRecordingId, 'localRecordingId');

    if (!Object.values(DongleRecordingSyncStatus).includes(dto.syncStatus)) {
      throw new BadRequestException('syncStatus is invalid.');
    }
  }

  private validateCreateRecording(dto: CreateRecordingDto) {
    assertPlainObject(dto, 'CreateRecordingDto');
    assertEnumValue(CaptureSource, dto.source, 'source');
    assertOptionalString(dto.deviceId, 'deviceId');
    assertRequiredString(dto.mimeType, 'mimeType');
    assertOptionalNonNegativeInteger(dto.durationMs, 'durationMs');
  }

  private validateUpdateStatus(dto: UpdateRecordingStatusDto) {
    assertPlainObject(dto, 'UpdateRecordingStatusDto');
    assertEnumValue(RecordingStatus, dto.status, 'status');
  }

  private requireNonEmptyString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${fieldName} must be a non-empty string.`);
    }
  }
}

type ResultRecording = {
  status: string;
  transcript?: { text: string } | null;
  memoryEvent?: {
    type: string;
    processingStatus: string;
    note?: {
      actionItems?: Array<unknown>;
      reminders?: Array<unknown>;
    } | null;
  } | null;
  aiJobs?: Array<{
    type: string;
    status: string;
    lastError?: string | null;
  }>;
};

function describeResultStatus(recording: ResultRecording) {
  const failedJob = recording.aiJobs?.find((job) => job.status === 'failed');
  const processingStatus = recording.memoryEvent?.processingStatus;

  if (recording.status === 'failed' || processingStatus === 'transcription_failed' || failedJob) {
    return 'failed';
  }

  if (recording.status === 'completed' || processingStatus === 'thread_attached') {
    return 'saved';
  }

  if (processingStatus === 'summary_created' || hasRunningJob(recording, ['action_extraction', 'reminder_suggestion', 'embedding', 'timeline_update'])) {
    return 'extracting';
  }

  if (recording.transcript && (!recording.memoryEvent?.note || hasRunningJob(recording, ['summary', 'classification']))) {
    return 'summarizing';
  }

  if (recording.status === 'uploaded' || recording.status === 'processing' || hasRunningJob(recording, ['transcription'])) {
    return 'transcribing';
  }

  if (recording.status === 'created' || recording.status === 'recording' || recording.status === 'uploading') {
    return 'uploading';
  }

  return 'saved';
}

function hasRunningJob(recording: ResultRecording, types: string[]) {
  return Boolean(
    recording.aiJobs?.some(
      (job) =>
        types.includes(job.type) &&
        (job.status === 'pending' || job.status === 'processing' || job.status === 'retrying'),
    ),
  );
}

function getResultError(recording: ResultRecording) {
  const failedJob = recording.aiJobs?.find((job) => job.status === 'failed' && job.lastError);
  return failedJob?.lastError ?? null;
}

function detectResultType(
  eventType: string | undefined,
  actions: Array<unknown>,
  reminders: Array<unknown>,
) {
  if (eventType === 'task' || actions.length > 0) {
    return 'task';
  }

  if (eventType === 'idea') {
    return 'idea';
  }

  if (reminders.length > 0) {
    return 'reminder';
  }

  return 'note';
}

function mapDongleSyncToDeviceStatus(syncStatus: DongleRecordingSyncStatus): DeviceStatus {
  switch (syncStatus) {
    case DongleRecordingSyncStatus.SYNC_FAILED:
      return DeviceStatus.ERROR;
    case DongleRecordingSyncStatus.CONFIRMED_BY_BACKEND:
    case DongleRecordingSyncStatus.SAFE_TO_DELETE_FROM_DEVICE:
      return DeviceStatus.PAIRED;
    default:
      return DeviceStatus.SYNCING;
  }
}
