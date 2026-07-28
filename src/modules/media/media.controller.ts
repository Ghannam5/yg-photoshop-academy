import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import type { MediaQueryDto } from './dto/media-query.dto';
import { MediaService } from './media.service';

@ApiTags('Media')
@Controller('media')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('library')
  @Roles('ADMIN', 'INSTRUCTOR')
  @ApiOperation({ summary: 'List the media library (admin/instructor)' })
  async list(@Query() query: MediaQueryDto) {
    return this.mediaService.listLibrary(query);
  }

  @Post('upload')
  @Roles('ADMIN', 'INSTRUCTOR')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file to the media library' })
  @ApiResponse({ status: 201, description: 'File uploaded.' })
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('FILE_REQUIRED');
    return this.mediaService.uploadToLibrary(user.id, file);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a media file' })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.mediaService.remove(id, user.id, user.role === 'ADMIN');
  }
}
