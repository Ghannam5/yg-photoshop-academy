import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CleanupTask } from './cleanup.task';

@Module({
  imports: [PrismaModule],
  providers: [CleanupTask],
})
export class TasksModule {}
