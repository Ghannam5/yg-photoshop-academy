import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { LearningModule } from '../learning/learning.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { StorageService } from './storage.service';
import { StreamingService } from './streaming.service';
import { VideoController } from './video.controller';

@Module({
  imports: [PrismaModule, AuthModule, LearningModule],
  controllers: [MediaController, VideoController],
  providers: [MediaService, StorageService, StreamingService],
  exports: [MediaService, StorageService, StreamingService],
})
export class MediaModule {}
