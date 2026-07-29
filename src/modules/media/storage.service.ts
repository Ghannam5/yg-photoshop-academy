import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadPurpose } from '@prisma/client';
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { tmpdir } from 'os';
import { PrismaService } from '../../prisma/prisma.service';

export interface UploadInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  userId: string;
  purpose: UploadPurpose;
}

export interface StoredFile {
  filename: string;
  path: string;
  url: string;
  size: number;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const defaultDir = process.env.VERCEL ? join(tmpdir(), 'uploads') : join(process.cwd(), 'uploads');
    this.uploadDir = this.config.get('UPLOAD_DIR') ?? defaultDir;
    this.baseUrl = (
      this.config.get('API_URL') ??
      this.config.get('FRONTEND_URL') ??
      'http://localhost:3001'
    ).replace(/\/$/, '');
  }

  onModuleInit(): void {
    try {
      if (!existsSync(this.uploadDir)) {
        mkdirSync(this.uploadDir, { recursive: true });
        this.logger.log(`Created upload directory: ${this.uploadDir}`);
      }
    } catch (error) {
      this.logger.warn(`Could not create upload directory ${this.uploadDir}: ${(error as Error).message}`);
    }
  }

  async uploadFile(input: UploadInput): Promise<StoredFile> {
    const ext = extname(input.originalName).toLowerCase();
    const filename = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;
    const relativePath = join('uploads', filename);
    const absolutePath = join(this.uploadDir, filename);

    writeFileSync(absolutePath, input.buffer);

    const url = `${this.baseUrl}/uploads/${filename}`;

    await this.prisma.upload.create({
      data: {
        userId: input.userId,
        filename,
        mimeType: input.mimeType,
        fileSize: input.buffer.length,
        fileUrl: url,
        purpose: input.purpose,
      },
    });

    return { filename, path: relativePath, url, size: input.buffer.length };
  }
}
