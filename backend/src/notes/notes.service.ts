import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(supabaseUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseUserId } });
    if (!user) {
      return [];
    }

    return this.prisma.note.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        memoryEvent: true,
        noteTags: { include: { tag: true } },
        actionItems: true,
        reminders: true,
      },
    });
  }

  get(supabaseUserId: string, id: string) {
    return this.findOwnedNote(supabaseUserId, id);
  }

  async update(supabaseUserId: string, id: string, dto: UpdateNoteDto) {
    const note = await this.findOwnedNote(supabaseUserId, id);

    return this.prisma.note.update({
      where: { id: note.id },
      data: {
        title: dto.title,
        summary: dto.summary,
        body: dto.body,
      },
    });
  }

  async remove(supabaseUserId: string, id: string) {
    const note = await this.findOwnedNote(supabaseUserId, id);

    await this.prisma.note.delete({ where: { id: note.id } });
    return { id, deleted: true };
  }

  private async findOwnedNote(supabaseUserId: string, id: string) {
    const note = await this.prisma.note.findFirst({
      where: {
        id,
        user: { supabaseUserId },
      },
      include: {
        memoryEvent: true,
        chunks: true,
        noteTags: { include: { tag: true } },
        actionItems: true,
        reminders: true,
      },
    });

    if (!note) {
      throw new NotFoundException('Note not found.');
    }

    return note;
  }
}

export interface UpdateNoteDto {
  title?: string;
  summary?: string;
  body?: string;
}
