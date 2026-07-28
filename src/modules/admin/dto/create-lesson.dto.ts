import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateLessonDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isFree?: boolean;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  videoDuration?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  attachmentUrl?: string;
}
