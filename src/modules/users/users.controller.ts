import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { StorageService } from '../media/storage.service';
import { UsersService } from './users.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly storage: StorageService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the current user profile with extended profile data' })
  @ApiResponse({ status: 200, description: 'User profile.' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated.' })
  async update(@Body() dto: UpdateProfileDto, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload and set the current user avatar' })
  @ApiResponse({ status: 201, description: 'Avatar updated.' })
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('FILE_REQUIRED');
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('INVALIDFILETYPE');
    }
    const stored = await this.storage.uploadFile({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      userId: user.id,
      purpose: 'AVATAR',
    });
    const profile = await this.usersService.setAvatar(user.id, stored.url);
    return { avatarUrl: stored.url, profile };
  }
}
