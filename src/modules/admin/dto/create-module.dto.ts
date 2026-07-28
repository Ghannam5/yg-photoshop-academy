import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateModuleDto {
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
}
