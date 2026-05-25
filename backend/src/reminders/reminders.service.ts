import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateReminderDto, UpdateReminderDto } from '@voxa/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(supabaseUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseUserId } });
    if (!user) {
      return [];
    }

    return this.prisma.reminder.findMany({
      where: { userId: user.id },
      orderBy: { remindAt: 'asc' },
      include: { note: true },
    });
  }

  async create(supabaseUserId: string, email: string | undefined, dto: CreateReminderDto) {
    const user = await this.prisma.user.upsert({
      where: { supabaseUserId },
      update: { email },
      create: { supabaseUserId, email },
    });

    return this.prisma.reminder.create({
      data: {
        userId: user.id,
        noteId: dto.noteId,
        title: dto.title,
        remindAt: new Date(dto.remindAt),
        source: 'user',
      },
    });
  }

  async update(supabaseUserId: string, id: string, dto: UpdateReminderDto) {
    const reminder = await this.findOwnedReminder(supabaseUserId, id);

    return this.prisma.reminder.update({
      where: { id: reminder.id },
      data: {
        title: dto.title,
        remindAt: dto.remindAt ? new Date(dto.remindAt) : undefined,
        dismissedAt:
          dto.dismissedAt === null ? null : dto.dismissedAt ? new Date(dto.dismissedAt) : undefined,
      },
    });
  }

  async remove(supabaseUserId: string, id: string) {
    const reminder = await this.findOwnedReminder(supabaseUserId, id);

    await this.prisma.reminder.delete({ where: { id: reminder.id } });
    return { id, deleted: true };
  }

  private async findOwnedReminder(supabaseUserId: string, id: string) {
    const reminder = await this.prisma.reminder.findFirst({
      where: {
        id,
        user: { supabaseUserId },
      },
    });

    if (!reminder) {
      throw new NotFoundException('Reminder not found.');
    }

    return reminder;
  }
}
