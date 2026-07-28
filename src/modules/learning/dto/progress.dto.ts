import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class UpdateLessonProgressDto {
  @ApiProperty({ description: 'Lesson UUID' })
  @IsString()
  @IsNotEmpty()
  lessonId!: string;

  @ApiProperty({ description: 'Seconds watched so far', minimum: 0 })
  @IsInt()
  @Min(0)
  watchedSeconds!: number;

  @ApiProperty({ description: 'Total lesson duration in seconds', minimum: 0 })
  @IsInt()
  @Min(0)
  totalSeconds!: number;
}
