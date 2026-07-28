import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTicketDto {
  @ApiProperty({ minLength: 5, maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject!: string;

  @ApiProperty({ minLength: 10, maxLength: 5000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ enum: TicketPriority, default: TicketPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}

export class CreateReplyDto {
  @ApiProperty({ minLength: 1, maxLength: 5000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] })
  @IsString()
  @IsNotEmpty()
  status!: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
}

export class TicketQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] })
  @IsOptional()
  @IsString()
  status?: string;
}
