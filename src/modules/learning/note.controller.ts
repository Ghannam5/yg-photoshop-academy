import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import type { CreateNoteDto, UpdateNoteDto } from './dto';
import { NoteService } from './note.service';

@ApiTags('Notes')
@Controller('notes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Post()
  @ApiOperation({ summary: 'Create a note for a lesson' })
  @ApiResponse({ status: 201, description: 'Note created.' })
  async create(@Body() dto: CreateNoteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.noteService.create(user.id, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'List the current user notes, optionally filtered by lesson' })
  @ApiResponse({ status: 200, description: 'User notes.' })
  async mine(@CurrentUser() user: AuthenticatedUser, @Query('lessonId') lessonId?: string) {
    return this.noteService.listMine(user.id, lessonId);
  }

  @Patch(':noteId')
  @ApiOperation({ summary: 'Update a note' })
  @ApiResponse({ status: 200, description: 'Note updated.' })
  async update(
    @Param('noteId') noteId: string,
    @Body() dto: UpdateNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.noteService.update(user.id, noteId, dto);
  }

  @Delete(':noteId')
  @ApiOperation({ summary: 'Soft delete a note' })
  @ApiResponse({ status: 200, description: 'Note deleted.' })
  async remove(@Param('noteId') noteId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.noteService.remove(user.id, noteId);
  }
}
