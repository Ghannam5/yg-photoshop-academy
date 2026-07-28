import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { CurrentUser } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { BookmarkService } from './bookmark.service';

export class ToggleBookmarkDto {
  @ApiProperty({ description: 'Lesson UUID' })
  @IsString()
  @IsNotEmpty()
  lessonId!: string;
}

@ApiTags('Bookmarks')
@Controller('bookmarks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

  @Post('toggle')
  @ApiOperation({ summary: 'Add or remove a bookmark for a lesson' })
  @ApiResponse({ status: 201, description: 'Bookmark toggled.' })
  async toggle(@Body() dto: ToggleBookmarkDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bookmarkService.toggle(user.id, dto.lessonId);
  }

  @Get('me')
  @ApiOperation({ summary: 'List the current user bookmarks' })
  @ApiResponse({ status: 200, description: 'User bookmarks.' })
  async mine(@CurrentUser() user: AuthenticatedUser) {
    return this.bookmarkService.listMine(user.id);
  }
}
