import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { LearningModule } from '../learning/learning.module';
import { EnrollmentCodesController } from './enrollment-codes.controller';
import { EnrollmentCodesService } from './enrollment-codes.service';

@Module({
  imports: [PrismaModule, AuthModule, LearningModule],
  controllers: [EnrollmentCodesController],
  providers: [EnrollmentCodesService],
  exports: [EnrollmentCodesService],
})
export class EnrollmentCodesModule {}
