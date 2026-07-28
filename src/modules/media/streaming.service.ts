import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { EnrollmentService } from '../learning/enrollment.service';

type StreamProvider = 'LOCAL' | 'BUNNY' | 'CLOUDFLARE';

export interface PlaybackPayload {
  provider: StreamProvider;
  lessonId: string;
  hlsUrl: string | null;
  posterUrl: string | null;
  token: string | null;
  expiresAt: number;
  watermark: string;
}

@Injectable()
export class StreamingService {
  private readonly logger = new Logger(StreamingService.name);
  private readonly provider: StreamProvider;
  private readonly ttl: number;
  private readonly signingSecret: string;
  private readonly bunnyHostname: string;
  private readonly bunnyKey: string;
  private readonly cfHostname: string;
  private readonly cfKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollment: EnrollmentService,
    config: ConfigService,
  ) {
    this.provider = (config.get('STREAM_PROVIDER') ?? 'LOCAL').toUpperCase() as StreamProvider;
    this.ttl = parseInt(config.get('STREAMTOKENTTL') ?? '3600', 10);
    this.signingSecret =
      config.get('STREAMSIGNINGSECRET') ?? config.get('JWT_SECRET') ?? 'dev-secret';
    this.bunnyHostname = config.get('BUNNYSTREAMHOSTNAME') ?? '';
    this.bunnyKey = config.get('BUNNYSTREAMKEY') ?? '';
    this.cfHostname = config.get('CLOUDFLARESTREAMHOSTNAME') ?? '';
    this.cfKey = config.get('CLOUDFLARESTREAMKEY') ?? '';
  }

  async getPlayback(lessonId: string, user: AuthenticatedUser): Promise<PlaybackPayload> {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, deletedAt: null },
      include: { video: true, module: { select: { courseId: true } } },
    });
    if (!lesson) throw new NotFoundException('LESSONNOTFOUND');

    if (!lesson.isFree) {
      const hasAccess = await this.enrollment.hasAccess(user.id, lesson.module.courseId);
      if (!hasAccess) throw new ForbiddenException('ENROLLMENT_REQUIRED');
    }

    const expiresAt = Math.floor(Date.now() / 1000) + this.ttl;
    const videoUrl = lesson.video?.videoUrl ?? null;
    const videoId = this.extractVideoId(videoUrl);
    const watermark = user.email;

    let hlsUrl: string | null = null;
    let token: string | null = null;

    switch (this.provider) {
      case 'BUNNY':
        ({ hlsUrl, token } = this.signBunny(videoId ?? lesson.id, expiresAt));
        break;
      case 'CLOUDFLARE':
        ({ hlsUrl, token } = this.signCloudflare(videoId ?? lesson.id, expiresAt));
        break;
      case 'LOCAL':
      default:
        ({ hlsUrl, token } = this.signLocal(lesson.id, user.id, videoUrl, expiresAt));
        break;
    }

    return {
      provider: this.provider,
      lessonId: lesson.id,
      hlsUrl,
      posterUrl: lesson.video?.thumbnailUrl ?? null,
      token,
      expiresAt,
      watermark,
    };
  }

  private signLocal(lessonId: string, userId: string, videoUrl: string | null, exp: number) {
    const payload = `${lessonId}:${userId}:${exp}`;
    const token = createHmac('sha256', this.signingSecret).update(payload).digest('hex');
    if (!videoUrl) return { hlsUrl: null, token };
    const separator = videoUrl.includes('?') ? '&' : '?';
    return { hlsUrl: `${videoUrl}${separator}exp=${exp}&token=${token}`, token };
  }

  private signBunny(videoId: string, exp: number) {
    if (!this.bunnyHostname || !this.bunnyKey) {
      this.logger.warn('Bunny Stream not configured; returning unsigned URL');
      return { hlsUrl: null, token: null };
    }
    const signature = createHmac('sha256', this.bunnyKey).update(`${videoId}${exp}`).digest('hex');
    const hlsUrl = `https://${this.bunnyHostname}/${videoId}/playlist.m3u8?token=${signature}&expires=${exp}`;
    return { hlsUrl, token: signature };
  }

  private signCloudflare(videoId: string, exp: number) {
    if (!this.cfHostname || !this.cfKey) {
      this.logger.warn('Cloudflare Stream not configured; returning unsigned URL');
      return { hlsUrl: null, token: null };
    }
    const policy = this.base64Url(JSON.stringify({ exp }));
    const signature = this.base64Url(
      createHmac('sha256', this.cfKey).update(policy).digest(),
    );
    const hlsUrl = `https://${this.cfHostname}/${videoId}/manifest/video.m3u8?policy=${policy}&signature=${signature}`;
    return { hlsUrl, token: signature };
  }

  private extractVideoId(videoUrl: string | null): string | null {
    if (!videoUrl) return null;
    const last = videoUrl.split('/').filter(Boolean).pop();
    return last ? last.replace(/\.[^.]+$/, '') : null;
  }

  private base64Url(input: string | Buffer): string {
    const buf = typeof input === 'string' ? Buffer.from(input) : input;
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}
