import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateInsightDto } from '@voxa/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(supabaseUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseUserId } });
    if (!user) {
      return [];
    }

    return this.prisma.insight.findMany({
      where: { userId: user.id },
      orderBy: [{ isRead: 'asc' }, { importanceScore: 'desc' }, { createdAt: 'desc' }],
      include: { relatedThread: true },
    });
  }

  async get(supabaseUserId: string, id: string) {
    const insight = await this.findOwnedInsight(supabaseUserId, id);
    return insight;
  }

  async update(supabaseUserId: string, id: string, dto: UpdateInsightDto) {
    const insight = await this.findOwnedInsight(supabaseUserId, id);

    return this.prisma.insight.update({
      where: { id: insight.id },
      data: { isRead: dto.isRead },
    });
  }

  private async findOwnedInsight(supabaseUserId: string, id: string) {
    const insight = await this.prisma.insight.findFirst({
      where: {
        id,
        user: { supabaseUserId },
      },
      include: { relatedThread: true },
    });

    if (!insight) {
      throw new NotFoundException('Insight not found.');
    }

    return insight;
  }
}

