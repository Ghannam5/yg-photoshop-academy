import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateEmailTemplateDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  htmlContent?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  textContent?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
