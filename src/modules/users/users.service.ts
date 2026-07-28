import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ActivityType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user || user.deletedAt) throw new NotFoundException('USERNOTFOUND');
    const { password, ...safe } = user;
    return safe;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new NotFoundException('USERNOTFOUND');

    const userFields: Prisma.UserUpdateInput = {};
    if (dto.firstName !== undefined) userFields.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) userFields.lastName = dto.lastName.trim();
    if (dto.bio !== undefined) userFields.bio = dto.bio;

    const profileFields: Prisma.UserProfileUncheckedUpdateInput = {};
    if (dto.phone !== undefined) profileFields.phone = dto.phone || null;
    if (dto.dateOfBirth !== undefined) {
      profileFields.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    }
    if (dto.gender !== undefined) profileFields.gender = dto.gender || null;
    if (dto.country !== undefined) profileFields.country = dto.country || null;
    if (dto.city !== undefined) profileFields.city = dto.city || null;
    if (dto.website !== undefined) profileFields.website = dto.website || null;
    if (dto.github !== undefined) profileFields.github = dto.github || null;
    if (dto.linkedin !== undefined) profileFields.linkedin = dto.linkedin || null;
    if (dto.twitter !== undefined) profileFields.twitter = dto.twitter || null;

    const hasUserFields = Object.keys(userFields).length > 0;
    const hasProfileFields = Object.keys(profileFields).length > 0;

    const updated = await this.prisma.$transaction(async (tx) => {
      const savedUser = hasUserFields
        ? await tx.user.update({ where: { id: userId }, data: userFields })
        : await tx.user.findUniqueOrThrow({ where: { id: userId } });

      if (hasProfileFields) {
        await tx.userProfile.upsert({
          where: { userId },
          update: profileFields,
          create: { userId, ...profileFields } as Prisma.UserProfileUncheckedCreateInput,
        });
      }

      return tx.user.findUniqueOrThrow({ where: { id: userId }, include: { profile: true } });
    });

    try {
      await this.prisma.activityLog.create({
        data: { userId, type: ActivityType.PROFILE_UPDATE, title: 'Profile updated' },
      });
    } catch (error) {
      this.logger.error('Activity log failed', (error as Error).stack);
    }

    const { password, ...safe } = updated;
    return safe;
  }

  async setAvatar(userId: string, avatarUrl: string) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      include: { profile: true },
    });
    const { password, ...safe } = updated;
    return safe;
  }
}
