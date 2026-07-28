import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BookmarkService {
  constructor(private readonly prisma: PrismaService) {}

  async toggle(userId: string, lessonId: string): Promise<{ bookmarked: boolean }> {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, deletedAt: null },
      include: { module: { select: { courseId: true } } },
    });
    if (!lesson) {
      throw new NotFoundException('LESSONNOTFOUND');
    }

    const courseId = lesson.module.courseId;

    const existing = await this.prisma.bookmark.findFirst({
      where: { userId, courseId, lessonId },
    });

    if (existing) {
      await this.prisma.bookmark.delete({ where: { id: existing.id } });
      return { bookmarked: false };
    }

    await this.prisma.bookmark.create({ data: { userId, courseId, lessonId } });
    return { bookmarked: true };
  }

  async listMine(userId: string) {
    const bookmarks = await this.prisma.bookmark.findMany({
      where: { userId },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            slug: true,
            duration: true,
            module: {
              select: {
                id: true,
                title: true,
                course: { select: { id: true, title: true, slug: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookmarks.map((bookmark) => ({
      id: bookmark.id,
      createdAt: bookmark.createdAt,
      lesson: bookmark.lesson,
    }));
  }
}
