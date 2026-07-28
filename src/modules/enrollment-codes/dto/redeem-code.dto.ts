import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RedeemCodeDto {
  @ApiProperty({ description: 'Enrollment code to redeem' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiPropertyOptional({ description: 'Target course ID to validate code against' })
  @IsString()
  @IsOptional()
  courseId?: string;
}
