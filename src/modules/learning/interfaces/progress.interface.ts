export interface CourseProgressSummary {
  enrollmentId: string;
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  percentage: number;
  lastLessonId: string | null;
  lastWatchedAt: Date | null;
  totalTimeWatched: number;
  completedAt: Date | null;
}

export interface LessonProgressInput {
  lessonId: string;
  watchedSeconds: number;
  totalSeconds: number;
}
