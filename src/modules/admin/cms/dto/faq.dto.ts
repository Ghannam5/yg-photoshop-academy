import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateFaqDto {
  @ApiProperty()
  @IsString()
  question!: string;

  @ApiProperty()
  @IsString()
  answer!: string;

  @ApiPropertyOptional({ default: 'general' })
  @IsString()
  @IsOptional()
  category?: string = 'general';

  @ApiPropertyOptional({ default: 0 })
  @IsNumber()
  @IsOptional()
  order?: number = 0;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}

export class UpdateFaqDto extends PartialType(CreateFaqDto) {}
