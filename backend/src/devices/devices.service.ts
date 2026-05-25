import { Injectable, NotFoundException } from '@nestjs/common';
import { PairDeviceDto } from '@voxa/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async pair(supabaseUserId: string, email: string | undefined, dto: PairDeviceDto) {
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
        displayName: dto.displayName,
        firmwareVersion: dto.firmwareVersion,
        status: 'active',
        lastSeenAt: new Date(),
      },
      create: {
        userId: user.id,
        hardwareId: dto.deviceId,
        displayName: dto.displayName,
        firmwareVersion: dto.firmwareVersion,
        lastSeenAt: new Date(),
      },
    });
  }

  async list(supabaseUserId: string) {
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
    return this.findOwnedDevice(supabaseUserId, id);
  }

  async update(supabaseUserId: string, id: string, dto: Partial<PairDeviceDto>) {
    const device = await this.findOwnedDevice(supabaseUserId, id);

    return this.prisma.device.update({
      where: { id: device.id },
      data: {
        displayName: dto.displayName,
        firmwareVersion: dto.firmwareVersion,
        lastSeenAt: new Date(),
      },
    });
  }

  async remove(supabaseUserId: string, id: string) {
    const device = await this.findOwnedDevice(supabaseUserId, id);

    return this.prisma.device.update({
      where: { id: device.id },
      data: { status: 'revoked' },
    });
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
}
