import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { AUTH } from '../../auth/constants/auth.constants';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(AUTH.NAME_REGEX, { message: 'First name contains invalid characters' })
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(AUTH.NAME_REGEX, { message: 'Last name contains invalid characters' })
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  github?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  linkedin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  twitter?: string;
}
