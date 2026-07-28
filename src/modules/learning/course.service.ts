import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseStatus, EnrollmentStatus, LessonStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LEARNING } from './constants/learning.constants';
import type { CourseQueryDto } from './dto';
import type { CourseWithCurriculum, Paginated } from './interfaces/course.interface';

@Injectable()
export class CourseService {
  constructor(private readonly prisma: PrismaService) {}

  async listCourses(query: CourseQueryDto): Promise<Paginated<CourseWithCurriculum>> {
    const page = query.page ?? LEARNING.DEFAULT_PAGE;
    const pageSize = query.pageSize ?? LEARNING.DEFAULTPAGESIZE;

    const where: Prisma.CourseWhereInput = {
      deletedAt: null,
      status: query.status ?? CourseStatus.PUBLISHED,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { subtitle: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.level ? { level: query.level } : {}),
      ...(query.category
        ? { categories: { some: { category: { slug: query.category } } } }
        : {}),
    };

    const [total, courses] = await this.prisma.$transaction([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({
        where,
        include: {
          categories: { include: { category: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: courses.map((course: any) => ({
        ...course,
        categories: course.categories.map((assignment: any) => assignment.category),
        modules: [],
      })),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async getCourseBySlug(slug: string, includeUnpublished = false): Promise<CourseWithCurriculum> {
    const course = await this.prisma.course.findFirst({
      where: {
        slug,
        deletedAt: null,
        ...(includeUnpublished ? {} : { status: CourseStatus.PUBLISHED }),
      },
      include: {
        categories: { include: { category: true } },
        modules: {
          where: { deletedAt: null, ...(includeUnpublished ? {} : { isPublished: true }) },
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              where: { deletedAt: null, ...(includeUnpublished ? {} : { status: LessonStatus.PUBLISHED }) },
              orderBy: { order: 'asc' },
              include: {
                video: true,
                resources: true,
                attachments: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('COURSENOTFOUND');
    }

    return {
      ...course,
      categories: course.categories.map((assignment: any) => assignment.category),
    } as any;
  }

  async getCurriculum(courseId: string, userId: string): Promise<CourseWithCurriculum> {
    const course = await this.getCourseBySlug(courseId, false);

    const enrollment = await this.prisma.studentEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
      include: {
        progress: { include: { lessonProgress: true } },
      },
    });

    const isEnrolled =
      enrollment !== null &&
      (enrollment.status === EnrollmentStatus.ACTIVE || enrollment.status === EnrollmentStatus.COMPLETED);

    const completedLessonIds = new Set(
      enrollment?.progress?.lessonProgress
        .filter((lp: any) => lp.status === 'COMPLETED')
        .map((lp: any) => lp.lessonId) ?? [],
    );

    return {
      ...course,
      modules: course.modules.map((module: any) => ({
        ...module,
        lessons: module.lessons.map((lesson: any) => ({
          ...lesson,
          isCompleted: completedLessonIds.has(lesson.id),
          isLocked: !isEnrolled && !lesson.isFree,
          videoUrl: isEnrolled || lesson.isFree ? lesson.video?.videoUrl ?? null : null,
        })),
      })),
    } as any;
  }
}
