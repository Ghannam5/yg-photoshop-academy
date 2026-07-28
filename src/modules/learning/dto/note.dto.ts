import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateNoteDto {
  @ApiProperty({ description: 'Lesson UUID' })
  @IsString()
  @IsNotEmpty()
  lessonId!: string;

  @ApiProperty({ description: 'Note content', maxLength: 5000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;

  @ApiPropertyOptional({ description: 'Video timestamp in seconds', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  timestamp?: number;
}

export class UpdateNoteDto {
  @ApiProperty({ description: 'Note content', maxLength: 5000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;

  @ApiPropertyOptional({ description: 'Video timestamp in seconds', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  timestamp?: number;
}
