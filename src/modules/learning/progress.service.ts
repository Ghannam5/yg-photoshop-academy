import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ActivityType,
  CertificateStatus,
  EnrollmentStatus,
  LessonProgressStatus,
  LessonStatus,
  Prisma,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { LEARNING } from './constants/learning.constants';
import type { UpdateLessonProgressDto } from './dto';
import type { CourseProgressSummary } from './interfaces/progress.interface';

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async updateLessonProgress(
    userId: string,
    courseId: string,
    dto: UpdateLessonProgressDto,
  ): Promise<CourseProgressSummary> {
    const enrollment = await this.getEnrollment(userId, courseId);

    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: dto.lessonId,
        deletedAt: null,
        status: LessonStatus.PUBLISHED,
        module: { courseId: enrollment.courseId, deletedAt: null },
      },
    });
    if (!lesson) {
      throw new NotFoundException('LESSONNOTFOUND');
    }

    const progress = await this.prisma.studentProgress.findUnique({
      where: { enrollmentId: enrollment.id },
    });
    if (!progress) {
      throw new NotFoundException('PROGRESSNOTFOUND');
    }

    const totalSeconds = dto.totalSeconds > 0 ? dto.totalSeconds : lesson.videoDuration ?? 0;
    const watchedSeconds = Math.min(dto.watchedSeconds, totalSeconds || dto.watchedSeconds);
    const ratio = totalSeconds > 0 ? watchedSeconds / totalSeconds : 0;
    const isComplete = ratio >= LEARNING.COMPLETION_THRESHOLD;

    const status: LessonProgressStatus = isComplete
      ? LessonProgressStatus.COMPLETED
      : watchedSeconds > 0
        ? LessonProgressStatus.IN_PROGRESS
        : LessonProgressStatus.NOT_STARTED;

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const existingLessonProgress = await tx.lessonProgress.findUnique({
        where: { progressId_lessonId: { progressId: progress.id, lessonId: lesson.id } },
      });

      const wasCompleted = existingLessonProgress?.status === LessonProgressStatus.COMPLETED;

      await tx.lessonProgress.upsert({
        where: { progressId_lessonId: { progressId: progress.id, lessonId: lesson.id } },
        update: {
          status,
          watchedSeconds,
          totalSeconds,
          percentage: Math.round(ratio * 100),
          lastWatchedAt: now,
          ...(isComplete && !wasCompleted ? { completedAt: now } : {}),
        },
        create: {
          progressId: progress.id,
          lessonId: lesson.id,
          status,
          watchedSeconds,
          totalSeconds,
          percentage: Math.round(ratio * 100),
          lastWatchedAt: now,
          ...(isComplete ? { completedAt: now } : {}),
        },
      });

      await tx.watchHistory.create({
        data: {
          progressId: progress.id,
          lessonId: lesson.id,
          watchedAt: now,
          durationSec: watchedSeconds,
        },
      });

      const completedLessons = await tx.lessonProgress.count({
        where: { progressId: progress.id, status: LessonProgressStatus.COMPLETED },
      });

      const totalLessons = progress.totalLessons > 0 ? progress.totalLessons : 1;
      const percentage = Math.min(100, Math.round((completedLessons / totalLessons) * 100));
      const courseCompleted = percentage >= 100;

      await tx.studentProgress.update({
        where: { id: progress.id },
        data: {
          completedLessons,
          percentage,
          lastLessonId: lesson.id,
          lastWatchedAt: now,
          totalTimeWatched: progress.totalTimeWatched + watchedSeconds,
          ...(courseCompleted && !progress.completedAt ? { completedAt: now } : {}),
        },
      });

      if (courseCompleted && !progress.completedAt) {
        await tx.studentEnrollment.update({
          where: { id: enrollment.id },
          data: { status: EnrollmentStatus.COMPLETED, completedAt: now },
        });
        await this.issueCertificate(tx as unknown as PrismaService, userId, enrollment.id, courseId);
      }
    });

    await this.logActivity(userId, lesson.id, isComplete);

    return this.getCourseProgress(enrollment.id);
  }

  async getCourseProgress(enrollmentId: string): Promise<CourseProgressSummary> {
    const progress = await this.prisma.studentProgress.findUnique({
      where: { enrollmentId },
    });
    if (!progress) {
      throw new NotFoundException('PROGRESSNOTFOUND');
    }

    const enrollment = await this.prisma.studentEnrollment.findUnique({
      where: { id: enrollmentId },
      select: { courseId: true },
    });

    return {
      enrollmentId,
      courseId: enrollment!.courseId,
      totalLessons: progress.totalLessons,
      completedLessons: progress.completedLessons,
      percentage: progress.percentage,
      lastLessonId: progress.lastLessonId,
      lastWatchedAt: progress.lastWatchedAt,
      totalTimeWatched: progress.totalTimeWatched,
      completedAt: progress.completedAt,
    };
  }

  async getMyCourseProgress(userId: string, courseId: string): Promise<CourseProgressSummary> {
    const enrollment = await this.getEnrollment(userId, courseId);
    return this.getCourseProgress(enrollment.id);
  }

  private async getEnrollment(userId: string, courseId: string) {
    const enrollment = await this.prisma.studentEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    const hasAccess =
      enrollment !== null &&
      (enrollment.status === EnrollmentStatus.ACTIVE || enrollment.status === EnrollmentStatus.COMPLETED);

    if (!enrollment || !hasAccess) {
      throw new ForbiddenException('ENROLLMENT_REQUIRED');
    }
    return enrollment;
  }

  private async issueCertificate(
    tx: PrismaService,
    userId: string,
    enrollmentId: string,
    courseId: string,
  ): Promise<void> {
    const existing = await tx.certificate.findUnique({ where: { enrollmentId } });
    if (existing) return;

    const template = await tx.certificateTemplate.findFirst({
      where: { courseId, isActive: true },
    });
    if (!template) return;

    await tx.certificate.create({
      data: {
        userId,
        enrollmentId,
        templateId: template.id,
        certificateNumber: this.generateCode(template.prefix, LEARNING.CERTIFICATENUMBERLENGTH),
        verificationCode: this.generateCode('', LEARNING.VERIFICATIONCODELENGTH),
        status: CertificateStatus.ISSUED,
        issuedAt: new Date(),
      },
    });
  }

  private generateCode(prefix: string, length: number): string {
    const alphabet = LEARNING.CERTIFICATE_ALPHABET;
    const bytes = randomBytes(length);
    let code = '';
    for (let i = 0; i < length; i++) {
      code += alphabet[bytes[i] % alphabet.length];
    }
    return prefix ? `${prefix}-${code}` : code;
  }

  private async logActivity(userId: string, lessonId: string, completed: boolean): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId,
          type: completed ? ActivityType.LESSON_COMPLETE : ActivityType.LESSON_VIEW,
          title: completed ? 'Lesson completed' : 'Lesson watched',
          metadata: { lessonId },
        },
      });
    } catch {
      // Activity logging must never break the progress flow.
    }
  }
}
