import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CourseLevel } from '@prisma/client';

export class CreateCourseDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  subtitle?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ enum: CourseLevel, default: CourseLevel.ALL_LEVELS })
  @IsEnum(CourseLevel)
  @IsOptional()
  level?: CourseLevel = CourseLevel.ALL_LEVELS;

  @ApiPropertyOptional({ default: 'ar' })
  @IsString()
  @IsOptional()
  language?: string = 'ar';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  previewVideoUrl?: string;
}
