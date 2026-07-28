import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BookmarkController } from './bookmark.controller';
import { BookmarkService } from './bookmark.service';
import { CertificateController } from './certificate.controller';
import { CertificateService } from './certificate.service';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
import { CourseAccessGuard } from './guards';
import { NoteController } from './note.controller';
import { NoteService } from './note.service';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    CourseController,
    EnrollmentController,
    ProgressController,
    BookmarkController,
    NoteController,
    CertificateController,
    ReviewController,
  ],
  providers: [
    CourseService,
    EnrollmentService,
    ProgressService,
    BookmarkService,
    NoteService,
    CertificateService,
    ReviewService,
    CourseAccessGuard,
  ],
  exports: [CourseService, EnrollmentService, ProgressService, CertificateService, ReviewService],
})
export class LearningModule {}
