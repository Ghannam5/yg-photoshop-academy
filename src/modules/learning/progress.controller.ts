import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import type { UpdateLessonProgressDto } from './dto';
import { CourseAccessGuard } from './guards';
import { ProgressService } from './progress.service';

@ApiTags('Progress')
@Controller('courses/:courseId/progress')
@UseGuards(JwtAuthGuard, RolesGuard, CourseAccessGuard)
@ApiBearerAuth()
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get()
  @ApiOperation({ summary: 'Get course progress for the current user' })
  @ApiResponse({ status: 200, description: 'Course progress summary.' })
  async get(@Param('courseId') courseId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.progressService.getMyCourseProgress(user.id, courseId);
  }

  @Put('lesson')
  @ApiOperation({ summary: 'Update lesson watch progress and completion' })
  @ApiResponse({ status: 200, description: 'Updated progress summary.' })
  async updateLesson(
    @Param('courseId') courseId: string,
    @Body() dto: UpdateLessonProgressDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.progressService.updateLessonProgress(user.id, courseId, dto);
  }
}
