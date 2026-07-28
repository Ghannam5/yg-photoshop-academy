import { Injectable, NotFoundException } from '@nestjs/common';
import { FileType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { StoredFile } from './storage.service';
import { StorageService } from './storage.service';
import type { MediaQueryDto } from './dto/media-query.dto';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async uploadToLibrary(
    userId: string,
    file: Express.Multer.File,
    purpose: 'RESOURCE' | 'THUMBNAIL' | 'BANNER' | 'GENERAL' = 'GENERAL',
  ) {
    const stored: StoredFile = await this.storage.uploadFile({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      userId,
      purpose: purpose as any,
    });

    return this.prisma.mediaFile.create({
      data: {
        filename: stored.filename,
        mimeType: file.mimetype,
        size: stored.size,
        url: stored.url,
      },
    });
  }

  async listLibrary(query: MediaQueryDto) {
    const where: Prisma.MediaFileWhereInput = {};
    const [total, items] = await this.prisma.$transaction([
      this.prisma.mediaFile.count({ where }),
      this.prisma.mediaFile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: ((query.page ?? 1) - 1) * (query.pageSize ?? 20),
        take: query.pageSize ?? 20,
      }),
    ]);
    return {
      data: items,
      meta: {
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
        total,
        totalPages: Math.max(1, Math.ceil(total / (query.pageSize ?? 20))),
      },
    };
  }

  async remove(id: string, userId: string, isAdmin: boolean) {
    const media = await this.prisma.mediaFile.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('MEDIANOTFOUND');
    await this.prisma.mediaFile.delete({ where: { id } });
    return { deleted: true };
  }

  private detectType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) return FileType.IMAGE;
    if (mimeType.startsWith('video/')) return FileType.VIDEO;
    if (mimeType.startsWith('audio/')) return FileType.AUDIO;
    if (mimeType === 'application/pdf' || mimeType.includes('document') || mimeType.includes('word')) {
      return FileType.DOCUMENT;
    }
    if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('rar')) {
      return FileType.ARCHIVE;
    }
    return FileType.OTHER;
  }
}
