import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { EnrollmentService } from './enrollment.service';

@ApiTags('Enrollments')
@Controller('enrollments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Get('me')
  @ApiOperation({ summary: 'List the current user enrollments with progress' })
  @ApiResponse({ status: 200, description: 'User enrollments.' })
  async mine(@CurrentUser() user: AuthenticatedUser) {
    return this.enrollmentService.listMyEnrollments(user.id);
  }

  @Get('course/:courseId')
  @Roles('ADMIN', 'INSTRUCTOR')
  @ApiOperation({ summary: 'List enrolled students for a course (admin/instructor)' })
  @ApiResponse({ status: 200, description: 'Paginated enrolled students.' })
  async students(
    @Param('courseId') courseId: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.enrollmentService.listEnrolledStudents(
      courseId,
      Math.max(1, parseInt(page, 10) || 1),
      Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20)),
    );
  }
}
