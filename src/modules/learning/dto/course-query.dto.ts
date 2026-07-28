import { ApiPropertyOptional } from '@nestjs/swagger';
import { CourseLevel, CourseStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { LEARNING } from '../constants/learning.constants';

export class CourseQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: LEARNING.DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = LEARNING.DEFAULT_PAGE;

  @ApiPropertyOptional({ description: 'Items per page', default: LEARNING.DEFAULTPAGESIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LEARNING.MAXPAGESIZE)
  pageSize?: number = LEARNING.DEFAULTPAGESIZE;

  @ApiPropertyOptional({ description: 'Search by title' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: CourseLevel, description: 'Filter by difficulty level' })
  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @ApiPropertyOptional({ enum: CourseStatus, description: 'Filter by status (admin)' })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiPropertyOptional({ description: 'Filter by category slug' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}
