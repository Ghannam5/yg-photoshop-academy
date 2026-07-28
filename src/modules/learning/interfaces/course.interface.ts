import type {
  Course,
  CourseCategory,
  CourseModule,
  Lesson,
  LessonAttachment,
  LessonResource,
  LessonVideo,
} from '@prisma/client';

export interface LessonWithMedia extends Lesson {
  videos: LessonVideo[];
  resources: LessonResource[];
  attachments: LessonAttachment[];
  isCompleted?: boolean;
  isLocked?: boolean;
}

export interface ModuleWithLessons extends CourseModule {
  lessons: LessonWithMedia[];
}

export interface CourseWithCurriculum extends Course {
  categories: CourseCategory[];
  modules: ModuleWithLessons[];
}

export interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
