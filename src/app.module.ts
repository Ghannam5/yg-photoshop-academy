import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { appConfig, appValidationSchema } from './config/app.config';
import { DatabaseModule } from './database/database.module';
import { LoggerModule } from './common/logger/logger.module';
import { TasksModule } from './common/tasks/tasks.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { MailModule } from './modules/mail/mail.module';
import { LearningModule } from './modules/learning/learning.module';
import { EnrollmentCodesModule } from './modules/enrollment-codes/enrollment-codes.module';
import { MediaModule } from './modules/media/media.module';
import { SupportModule } from './modules/support/support.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AdminModule } from './modules/admin/admin.module';
import { RbacModule } from './modules/rbac/rbac.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validationSchema: appValidationSchema,
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    LoggerModule,
    TasksModule,
    MailModule,
    AuthModule,
    UsersModule,
    HealthModule,
    LearningModule,
    EnrollmentCodesModule,
    MediaModule,
    SupportModule,
    AnalyticsModule,
    AdminModule,
    RbacModule,
  ],
})
export class AppModule {}

