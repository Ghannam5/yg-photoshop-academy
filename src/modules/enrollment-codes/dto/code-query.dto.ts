import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { EnrollmentCodeStatus } from '@prisma/client';

export class CodeQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  courseId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: EnrollmentCodeStatus })
  @IsEnum(EnrollmentCodeStatus)
  @IsOptional()
  status?: EnrollmentCodeStatus;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number;
}
