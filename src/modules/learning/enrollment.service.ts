import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentStatus, Prisma, StudentEnrollment } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toPublicUser } from '../auth/utils/user.utils';

export interface EnrollmentRecord {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  enrolledAt: Date;
  completedAt: Date | null;
}

@Injectable()
export class EnrollmentService {
  constructor(private readonly prisma: PrismaService) {}

  async enroll(userId: string, courseId: string, enrollmentCodeId?: string): Promise<StudentEnrollment> {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
    });
    if (!course) {
      throw new NotFoundException('COURSENOTFOUND');
    }

    const existing = await this.prisma.studentEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (existing && existing.status === EnrollmentStatus.ACTIVE) {
      throw new ConflictException('ALREADY_ENROLLED');
    }

    if (existing) {
      return this.prisma.$transaction(async (tx) => {
        if (enrollmentCodeId) {
          await tx.enrollmentCode.update({
            where: { id: enrollmentCodeId },
            data: { status: 'USED', usedById: userId, usedAt: new Date() },
          });
        }
        
        const updated = await tx.studentEnrollment.update({
          where: { id: existing.id },
          data: {
            status: EnrollmentStatus.ACTIVE,
            enrollmentCodeId: enrollmentCodeId ?? existing.enrollmentCodeId,
            enrolledAt: new Date(),
            completedAt: null,
          },
        });
        
        await tx.auditLog.create({
          data: {
            userId,
            action: 'ENROLLMENT',
            entity: 'Course',
            details: { courseId, enrollmentCodeId },
          },
        });
        
        return updated;
      });
    }

    const totalLessons = await this.prisma.lesson.count({
      where: {
        deletedAt: null,
        status: 'PUBLISHED',
        module: { courseId, deletedAt: null, isPublished: true },
      },
    });

    return this.prisma.$transaction(async (tx) => {
      if (enrollmentCodeId) {
        await tx.enrollmentCode.update({
          where: { id: enrollmentCodeId },
          data: { status: 'USED', usedById: userId, usedAt: new Date() },
        });
      }

      const enrollment = await tx.studentEnrollment.create({
        data: {
          userId,
          courseId,
          enrollmentCodeId: enrollmentCodeId ?? null,
          status: EnrollmentStatus.ACTIVE,
        },
      });

      await tx.studentProgress.create({
        data: {
          enrollmentId: enrollment.id,
          totalLessons,
          completedLessons: 0,
          percentage: 0,
        },
      });
      
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ENROLLMENT',
          entity: 'Course',
          details: { courseId, enrollmentCodeId },
        },
      });

      return enrollment;
    });
  }

  async hasAccess(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.prisma.studentEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    return (
      enrollment !== null &&
      (enrollment.status === EnrollmentStatus.ACTIVE || enrollment.status === EnrollmentStatus.COMPLETED)
    );
  }

  async listMyEnrollments(userId: string) {
    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        userId,
        status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            subtitle: true,
            thumbnailUrl: true,
            totalLessons: true,
            level: true,
          },
        },
        progress: {
          select: {
            percentage: true,
            completedLessons: true,
            totalLessons: true,
            lastLessonId: true,
            lastWatchedAt: true,
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return enrollments.map((enrollment) => ({
      id: enrollment.id,
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
      completedAt: enrollment.completedAt,
      course: enrollment.course,
      progress: enrollment.progress,
    }));
  }

  async listEnrolledStudents(courseId: string, page: number, pageSize: number) {
    const where: Prisma.StudentEnrollmentWhereInput = { courseId };

    const [total, enrollments] = await this.prisma.$transaction([
      this.prisma.studentEnrollment.count({ where }),
      this.prisma.studentEnrollment.findMany({
        where,
        include: {
          user: true,
          progress: {
            select: { percentage: true, completedLessons: true, completedAt: true },
          },
        },
        orderBy: { enrolledAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: enrollments.map((enrollment) => ({
        id: enrollment.id,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
        progress: enrollment.progress,
        user: toPublicUser(enrollment.user),
      })),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }
}
