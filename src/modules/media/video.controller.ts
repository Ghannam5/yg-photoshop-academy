import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { StreamingService } from './streaming.service';

@ApiTags('Video Playback')
@Controller('media/videos')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class VideoController {
  constructor(private readonly streaming: StreamingService) {}

  @Get(':lessonId/playback')
  @ApiOperation({
    summary: 'Get a signed, time-limited playback URL for a lesson (HLS when configured)',
  })
  @ApiResponse({ status: 200, description: 'Signed playback payload with watermark.' })
  @ApiResponse({ status: 403, description: 'Enrollment required for non-free lessons.' })
  async playback(@Param('lessonId') lessonId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.streaming.getPlayback(lessonId, user);
  }
}
