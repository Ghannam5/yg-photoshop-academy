import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CourseStatus, LessonStatus, UserRole } from '@prisma/client';
import {
  CreateCourseDto,
  UpdateCourseDto,
  CreateModuleDto,
  CreateLessonDto,
  UpdateStudentStatusDto,
} from './dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // Course Management
  // ==========================================

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Date.now().toString(36);
  }

  async createCourse(dto: CreateCourseDto) {
    const slug = dto.slug || this.generateSlug(dto.title);
    return this.prisma.course.create({
      data: {
        ...dto,
        slug,
        status: CourseStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }

  async updateCourse(id: string, dto: UpdateCourseDto) {
    const course = await this.prisma.course.findUnique({ where: { id, deletedAt: null } });
    if (!course) throw new NotFoundException('Course not found');

    const data: any = { ...dto };
    if (dto.title && dto.title !== course.title) {
      data.slug = this.generateSlug(dto.title);
    }

    return this.prisma.course.update({
      where: { id },
      data,
    });
  }

  async deleteCourse(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id, deletedAt: null } });
    if (!course) throw new NotFoundException('Course not found');

    return this.prisma.course.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async toggleCoursePublish(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id, deletedAt: null } });
    if (!course) throw new NotFoundException('Course not found');

    const newStatus = course.status === CourseStatus.PUBLISHED ? CourseStatus.DRAFT : CourseStatus.PUBLISHED;

    return this.prisma.course.update({
      where: { id },
      data: { 
        status: newStatus,
        publishedAt: newStatus === CourseStatus.PUBLISHED ? new Date() : null 
      },
    });
  }

  // ==========================================
  // Module Management
  // ==========================================

  async addModule(courseId: string, dto: CreateModuleDto) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId, deletedAt: null } });
    if (!course) throw new NotFoundException('Course not found');

    return this.prisma.courseModule.create({
      data: {
        ...dto,
        courseId,
      },
    });
  }

  async updateModule(id: string, dto: Partial<CreateModuleDto>) {
    const module = await this.prisma.courseModule.findUnique({ where: { id, deletedAt: null } });
    if (!module) throw new NotFoundException('Module not found');

    return this.prisma.courseModule.update({
      where: { id },
      data: dto,
    });
  }

  async deleteModule(id: string) {
    const module = await this.prisma.courseModule.findUnique({ where: { id, deletedAt: null } });
    if (!module) throw new NotFoundException('Module not found');

    return this.prisma.courseModule.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ==========================================
  // Lesson Management
  // ==========================================

  async addLesson(moduleId: string, dto: CreateLessonDto) {
    const module = await this.prisma.courseModule.findUnique({ where: { id: moduleId, deletedAt: null } });
    if (!module) throw new NotFoundException('Module not found');

    const slug = dto.slug || this.generateSlug(dto.title);
    const { videoUrl, attachmentUrl, ...lessonData } = dto;

    const lesson = await this.prisma.lesson.create({
      data: {
        ...lessonData,
        slug,
        moduleId,
        status: LessonStatus.PUBLISHED,
      },
    });

    if (videoUrl) {
      await this.prisma.lessonVideo.create({
        data: {
          lessonId: lesson.id,
          videoUrl,
          duration: dto.duration || 0,
        },
      });
    }

    if (attachmentUrl) {
      await this.prisma.lessonAttachment.create({
        data: {
          lessonId: lesson.id,
          name: 'ماتريال وملفات الدرس',
          fileUrl: attachmentUrl,
          fileSize: 1024,
        },
      });
    }

    return lesson;
  }

  async updateLesson(id: string, dto: Partial<CreateLessonDto>) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id, deletedAt: null } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const { videoUrl, attachmentUrl, ...lessonData } = dto as any;
    if (dto.title && dto.title !== lesson.title) {
      lessonData.slug = this.generateSlug(dto.title);
    }

    const updated = await this.prisma.lesson.update({
      where: { id },
      data: lessonData,
    });

    if (videoUrl !== undefined) {
      const trimmedVid = (videoUrl || '').trim();
      if (trimmedVid) {
        await this.prisma.lessonVideo.upsert({
          where: { lessonId: id },
          create: { lessonId: id, videoUrl: trimmedVid, duration: dto.duration || lesson.duration || 0 },
          update: { videoUrl: trimmedVid, duration: dto.duration || lesson.duration || 0 },
        });
      } else {
        await this.prisma.lessonVideo.deleteMany({ where: { lessonId: id } });
      }
    }

    if (attachmentUrl !== undefined) {
      await this.prisma.lessonAttachment.deleteMany({ where: { lessonId: id } });
      const trimmedAttach = (attachmentUrl || '').trim();
      if (trimmedAttach) {
        await this.prisma.lessonAttachment.create({
          data: {
            lessonId: id,
            name: 'ماتريال وملفات الدرس',
            fileUrl: trimmedAttach,
            fileSize: 1024,
          },
        });
      }
    }

    return updated;
  }

  async deleteLesson(id: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id, deletedAt: null } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    return this.prisma.lesson.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async toggleLessonPublish(id: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id, deletedAt: null } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const nextStatus = lesson.status === LessonStatus.PUBLISHED ? LessonStatus.DRAFT : LessonStatus.PUBLISHED;
    return this.prisma.lesson.update({
      where: { id },
      data: { status: nextStatus },
    });
  }

  // ==========================================
  // Student Management
  // ==========================================

  async getStudents(page: number = 1, pageSize: number = 10, search?: string) {
    const skip = (page - 1) * pageSize;
    
    const where: any = {
      role: UserRole.STUDENT,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, students] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: students,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getStudent(id: string) {
    const student = await this.prisma.user.findFirst({
      where: { id, role: UserRole.STUDENT, deletedAt: null },
      include: {
        enrollments: {
          include: {
            course: true,
            progress: true,
          }
        },
      },
    });

    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  async updateStudentStatus(id: string, dto: UpdateStudentStatusDto) {
    const student = await this.prisma.user.findFirst({
      where: { id, role: UserRole.STUDENT, deletedAt: null },
    });

    if (!student) throw new NotFoundException('Student not found');

    return this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async getAllNotes() {
    return this.prisma.lessonNote.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        lesson: { select: { title: true } },
      },
    });
  }
}
