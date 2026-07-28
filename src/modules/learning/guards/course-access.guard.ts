import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { EnrollmentStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CourseAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const user = request.user;
    if (!user) {
      throw new ForbiddenException('AUTHENTICATION_REQUIRED');
    }

    const courseId = request.params.courseId ?? request.params.slug;
    if (!courseId) {
      return true;
    }

    const course = await this.prisma.course.findFirst({
      where: {
        OR: [{ id: courseId }, { slug: courseId }],
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!course) {
      throw new ForbiddenException('COURSENOTFOUND');
    }

    const enrollment = await this.prisma.studentEnrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });

    const hasAccess =
      enrollment !== null &&
      (enrollment.status === EnrollmentStatus.ACTIVE || enrollment.status === EnrollmentStatus.COMPLETED);

    if (!hasAccess) {
      throw new ForbiddenException('ENROLLMENT_REQUIRED');
    }

    return true;
  }
}
