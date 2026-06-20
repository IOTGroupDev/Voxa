import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ButtonGesture,
  CaptureSource,
  DeviceStatus,
  DeviceType,
  PairDeviceDto,
  StartDeviceCaptureDto,
  UpdateDeviceStatusDto,
} from '@voxa/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async pair(supabaseUserId: string, email: string | undefined, dto: PairDeviceDto) {
    this.ensureDongleModeEnabled();
    this.validatePairDevice(dto);
    const user = await this.prisma.user.upsert({
      where: { supabaseUserId },
      update: { email },
      create: { supabaseUserId, email },
    });

    return this.prisma.device.upsert({
      where: {
        userId_hardwareId: {
          userId: user.id,
          hardwareId: dto.deviceId,
        },
      },
      update: {
        type: dto.type ?? DeviceType.DONGLE,
        displayName: dto.displayName,
        firmwareVersion: dto.firmwareVersion,
        batteryLevel: dto.batteryLevel,
        storageCapacityBytes: dto.storageCapacityBytes,
        storageUsedBytes: dto.storageUsedBytes,
        supportsOfflineCapture: dto.supportsOfflineCapture,
        firmwareStorageVersion: dto.firmwareStorageVersion,
        status: DeviceStatus.PAIRED,
        lastSeenAt: new Date(),
      },
      create: {
        userId: user.id,
        hardwareId: dto.deviceId,
        type: dto.type ?? DeviceType.DONGLE,
        displayName: dto.displayName,
        firmwareVersion: dto.firmwareVersion,
        batteryLevel: dto.batteryLevel,
        storageCapacityBytes: dto.storageCapacityBytes,
        storageUsedBytes: dto.storageUsedBytes,
        supportsOfflineCapture: dto.supportsOfflineCapture ?? false,
        firmwareStorageVersion: dto.firmwareStorageVersion,
        lastSeenAt: new Date(),
      },
    });
  }

  async list(supabaseUserId: string) {
    if (!this.isDongleModeEnabled()) {
      return [];
    }

    const user = await this.prisma.user.findUnique({ where: { supabaseUserId } });
    if (!user) {
      return [];
    }

    return this.prisma.device.findMany({
      where: { userId: user.id },
      orderBy: [{ status: 'asc' }, { lastSeenAt: 'desc' }],
    });
  }

  get(supabaseUserId: string, id: string) {
    this.ensureDongleModeEnabled();
    return this.findOwnedDevice(supabaseUserId, id);
  }

  async update(supabaseUserId: string, id: string, dto: Partial<PairDeviceDto>) {
    this.ensureDongleModeEnabled();
    const device = await this.findOwnedDevice(supabaseUserId, id);

    return this.prisma.device.update({
      where: { id: device.id },
      data: {
        type: dto.type,
        displayName: dto.displayName,
        firmwareVersion: dto.firmwareVersion,
        batteryLevel: dto.batteryLevel,
        storageCapacityBytes: dto.storageCapacityBytes,
        storageUsedBytes: dto.storageUsedBytes,
        supportsOfflineCapture: dto.supportsOfflineCapture,
        firmwareStorageVersion: dto.firmwareStorageVersion,
        lastSeenAt: new Date(),
      },
    });
  }

  async remove(supabaseUserId: string, id: string) {
    return this.unpair(supabaseUserId, id);
  }

  async unpair(supabaseUserId: string, id: string) {
    this.ensureDongleModeEnabled();
    const device = await this.findOwnedDevice(supabaseUserId, id);

    return this.prisma.device.update({
      where: { id: device.id },
      data: { status: DeviceStatus.DISCONNECTED },
    });
  }

  async updateStatus(supabaseUserId: string, id: string, dto: UpdateDeviceStatusDto) {
    this.ensureDongleModeEnabled();
    if (!Object.values(DeviceStatus).includes(dto.status)) {
      throw new BadRequestException('Device status is invalid.');
    }

    const device = await this.findOwnedDevice(supabaseUserId, id);

    return this.prisma.device.update({
      where: { id: device.id },
      data: {
        status: dto.status,
        firmwareVersion: dto.firmwareVersion,
        batteryLevel: dto.batteryLevel,
        lastSeenAt: dto.status === DeviceStatus.PAIRED || dto.status === DeviceStatus.SYNCING ? new Date() : device.lastSeenAt,
      },
    });
  }

  async getStatus(supabaseUserId: string, id: string) {
    this.ensureDongleModeEnabled();
    const device = await this.findOwnedDevice(supabaseUserId, id);

    return {
      id: device.id,
      name: device.displayName ?? device.hardwareId,
      type: device.type,
      status: device.status,
      firmwareVersion: device.firmwareVersion,
      batteryLevel: device.batteryLevel,
      lastSeenAt: device.lastSeenAt,
      updatedAt: device.updatedAt,
    };
  }

  async startCapture(supabaseUserId: string, id: string, dto: StartDeviceCaptureDto) {
    this.ensureDongleModeEnabled();
    const device = await this.findOwnedDevice(supabaseUserId, id);
    if (device.status !== DeviceStatus.PAIRED && device.status !== DeviceStatus.SYNCING) {
      throw new BadRequestException('Device is not paired.');
    }

    const buttonGesture = dto.buttonGesture ?? ButtonGesture.SINGLE_PRESS;
    const captureType = mapGestureToCaptureType(buttonGesture);

    await this.prisma.device.update({
      where: { id: device.id },
      data: {
        status: DeviceStatus.SYNCING,
        lastSeenAt: new Date(),
      },
    });

    return {
      deviceId: device.id,
      hardwareId: device.hardwareId,
      source: CaptureSource.DONGLE,
      buttonGesture,
      captureType,
      nextAction: captureType === 'ask' ? 'ask' : 'record',
    };
  }

  private async findOwnedDevice(supabaseUserId: string, id: string) {
    const device = await this.prisma.device.findFirst({
      where: {
        id,
        user: { supabaseUserId },
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found.');
    }

    return device;
  }

  private isDongleModeEnabled() {
    return this.configService.get<string>('ENABLE_DONGLE_MODE') === 'true';
  }

  private ensureDongleModeEnabled() {
    if (!this.isDongleModeEnabled()) {
      throw new NotFoundException('Dongle mode is disabled.');
    }
  }

  private validatePairDevice(dto: PairDeviceDto) {
    if (typeof dto.deviceId !== 'string' || dto.deviceId.trim().length === 0) {
      throw new BadRequestException('deviceId must be a non-empty string.');
    }

    if (dto.type && dto.type !== DeviceType.DONGLE) {
      throw new BadRequestException('Only dongle devices are supported.');
    }

    if (
      dto.batteryLevel !== undefined &&
      (!Number.isInteger(dto.batteryLevel) || dto.batteryLevel < 0 || dto.batteryLevel > 100)
    ) {
      throw new BadRequestException('batteryLevel must be an integer from 0 to 100.');
    }
  }
}

type DongleCaptureType = 'note' | 'idea' | 'task' | 'reminder' | 'ask';

function mapGestureToCaptureType(buttonGesture: ButtonGesture): DongleCaptureType {
  switch (buttonGesture) {
    case ButtonGesture.DOUBLE_PRESS:
      return 'idea';
    case ButtonGesture.TRIPLE_PRESS:
      return 'task';
    case ButtonGesture.LONG_PRESS:
      return 'reminder';
    case ButtonGesture.HOLD_AND_SPEAK:
    case ButtonGesture.PRESS_AND_HOLD:
      return 'ask';
    case ButtonGesture.SINGLE_PRESS:
    default:
      return 'note';
  }
}
