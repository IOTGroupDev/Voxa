import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateActionItemDto } from '@voxa/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(supabaseUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseUserId } });
    if (!user) {
      return [];
    }

    return this.prisma.actionItem.findMany({
      where: { userId: user.id },
      orderBy: [{ completedAt: 'asc' }, { createdAt: 'desc' }],
      include: { note: true },
    });
  }

  async update(supabaseUserId: string, id: string, dto: UpdateActionItemDto) {
    const action = await this.findOwnedAction(supabaseUserId, id);

    return this.prisma.actionItem.update({
      where: { id: action.id },
      data: {
        title: dto.title,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        completedAt:
          dto.completedAt === null ? null : dto.completedAt ? new Date(dto.completedAt) : undefined,
      },
    });
  }

  async remove(supabaseUserId: string, id: string) {
    const action = await this.findOwnedAction(supabaseUserId, id);

    await this.prisma.actionItem.delete({ where: { id: action.id } });
    return { id, deleted: true };
  }

  private async findOwnedAction(supabaseUserId: string, id: string) {
    const action = await this.prisma.actionItem.findFirst({
      where: {
        id,
        user: { supabaseUserId },
      },
    });

    if (!action) {
      throw new NotFoundException('Action item not found.');
    }

    return action;
  }
}
