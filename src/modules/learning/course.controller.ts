import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Public } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CourseService } from './course.service';
import type { CourseQueryDto } from './dto';
import { CourseAccessGuard } from './guards';
import type { CourseWithCurriculum, Paginated } from './interfaces/course.interface';

@ApiTags('Courses')
@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published courses with pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of courses.' })
  async list(@Query() query: CourseQueryDto): Promise<Paginated<CourseWithCurriculum>> {
    return this.courseService.listCourses(query);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get a course by slug including its curriculum' })
  @ApiResponse({ status: 200, description: 'Course with curriculum.' })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  async getOne(@Param('slug') slug: string): Promise<CourseWithCurriculum> {
    return this.courseService.getCourseBySlug(slug);
  }

  @Get(':slug/curriculum')
  @UseGuards(CourseAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get full curriculum with per-lesson access and completion state' })
  @ApiResponse({ status: 200, description: 'Curriculum with access flags.' })
  async getCurriculum(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CourseWithCurriculum> {
    return this.courseService.getCurriculum(slug, user.id);
  }
}
