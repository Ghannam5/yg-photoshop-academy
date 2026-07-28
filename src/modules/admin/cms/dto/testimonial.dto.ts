import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateTestimonialDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  role?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty()
  @IsString()
  content!: string;

  @ApiPropertyOptional({ default: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number = 5;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean = false;
}

export class UpdateTestimonialDto extends PartialType(CreateTestimonialDto) {}
