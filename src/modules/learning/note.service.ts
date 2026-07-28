import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateNoteDto, UpdateNoteDto } from './dto';

@Injectable()
export class NoteService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateNoteDto) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: dto.lessonId, deletedAt: null },
    });
    if (!lesson) {
      throw new NotFoundException('LESSONNOTFOUND');
    }

    return this.prisma.lessonNote.create({
      data: {
        userId,
        lessonId: dto.lessonId,
        content: dto.content,
        timestamp: dto.timestamp ?? 0,
      },
    });
  }

  async listMine(userId: string, lessonId?: string) {
    return this.prisma.lessonNote.findMany({
      where: { userId, ...(lessonId ? { lessonId } : {}) },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            module: { select: { course: { select: { id: true, title: true, slug: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(userId: string, noteId: string, dto: UpdateNoteDto) {
    const note = await this.getOwnedNote(userId, noteId);
    return this.prisma.lessonNote.update({
      where: { id: note.id },
      data: { content: dto.content, timestamp: dto.timestamp ?? undefined },
    });
  }

  async remove(userId: string, noteId: string): Promise<{ deleted: boolean }> {
    const note = await this.getOwnedNote(userId, noteId);
    await this.prisma.lessonNote.delete({
      where: { id: note.id },
    });
    return { deleted: true };
  }

  private async getOwnedNote(userId: string, noteId: string) {
    const note = await this.prisma.lessonNote.findFirst({
      where: { id: noteId, userId },
    });
    if (!note) {
      throw new NotFoundException('NOTENOTFOUND');
    }
    if (note.userId !== userId) {
      throw new ForbiddenException('NOTENOTOWNED');
    }
    return note;
  }
}
