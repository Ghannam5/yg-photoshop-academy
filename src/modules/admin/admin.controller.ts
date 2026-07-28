import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/decorators';
import {
  CreateCourseDto,
  UpdateCourseDto,
  CreateModuleDto,
  CreateLessonDto,
  UpdateLessonDto,
  UpdateStudentStatusDto,
} from './dto';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==========================================
  // Course Management
  // ==========================================

  @Post('courses')
  @ApiOperation({ summary: 'Create a new course' })
  createCourse(@Body() dto: CreateCourseDto) {
    return this.adminService.createCourse(dto);
  }

  @Put('courses/:id')
  @ApiOperation({ summary: 'Update course details' })
  updateCourse(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.adminService.updateCourse(id, dto);
  }

  @Delete('courses/:id')
  @ApiOperation({ summary: 'Soft delete a course' })
  deleteCourse(@Param('id') id: string) {
    return this.adminService.deleteCourse(id);
  }

  @Patch('courses/:id/publish')
  @ApiOperation({ summary: 'Toggle publish status (DRAFT <-> PUBLISHED)' })
  toggleCoursePublish(@Param('id') id: string) {
    return this.adminService.toggleCoursePublish(id);
  }

  @Post('courses/:id/modules')
  @ApiOperation({ summary: 'Add a module to a course' })
  addModule(@Param('id') courseId: string, @Body() dto: CreateModuleDto) {
    return this.adminService.addModule(courseId, dto);
  }

  @Put('modules/:id')
  @ApiOperation({ summary: 'Update a module' })
  updateModule(@Param('id') id: string, @Body() dto: CreateModuleDto) {
    return this.adminService.updateModule(id, dto);
  }

  @Delete('modules/:id')
  @ApiOperation({ summary: 'Soft delete a module' })
  deleteModule(@Param('id') id: string) {
    return this.adminService.deleteModule(id);
  }

  @Post('modules/:id/lessons')
  @ApiOperation({ summary: 'Add a lesson to a module' })
  addLesson(@Param('id') moduleId: string, @Body() dto: CreateLessonDto) {
    return this.adminService.addLesson(moduleId, dto);
  }

  @Put('lessons/:id')
  @ApiOperation({ summary: 'Update a lesson' })
  updateLesson(@Param('id') id: string, @Body() dto: UpdateLessonDto) {
    return this.adminService.updateLesson(id, dto);
  }

  @Delete('lessons/:id')
  @ApiOperation({ summary: 'Soft delete a lesson' })
  deleteLesson(@Param('id') id: string) {
    return this.adminService.deleteLesson(id);
  }

  @Patch('lessons/:id/publish')
  @ApiOperation({ summary: 'Toggle lesson publish status (DRAFT <-> PUBLISHED)' })
  toggleLessonPublish(@Param('id') id: string) {
    return this.adminService.toggleLessonPublish(id);
  }

  // ==========================================
  // Student Management
  // ==========================================

  @Get('students')
  @ApiOperation({ summary: 'List students with pagination and search' })
  getStudents(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getStudents(page, pageSize, search);
  }

  @Get('students/:id')
  @ApiOperation({ summary: 'Get student details with enrollments' })
  getStudent(@Param('id') id: string) {
    return this.adminService.getStudent(id);
  }

  @Patch('students/:id/status')
  @ApiOperation({ summary: 'Update student status' })
  updateStudentStatus(@Param('id') id: string, @Body() dto: UpdateStudentStatusDto) {
    return this.adminService.updateStudentStatus(id, dto);
  }

  @Get('notes')
  @ApiOperation({ summary: 'Get all student lesson notes' })
  getAllNotes() {
    return this.adminService.getAllNotes();
  }
}
