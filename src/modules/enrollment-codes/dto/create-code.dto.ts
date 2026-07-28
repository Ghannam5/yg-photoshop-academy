import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ManualPaymentMethod } from '@prisma/client';

export class CreateCodeDto {
  @ApiProperty({ description: 'Course ID' })
  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @ApiPropertyOptional({ description: 'Student email (optional - restricts code to this email)' })
  @IsEmail()
  @IsOptional()
  studentEmail?: string;

  @ApiPropertyOptional({ description: 'Student name for reference' })
  @IsString()
  @IsOptional()
  studentName?: string;

  @ApiProperty({ enum: ManualPaymentMethod, default: 'INSTAPAY' })
  @IsEnum(ManualPaymentMethod)
  paymentMethod!: ManualPaymentMethod;

  @ApiPropertyOptional({ description: 'Payment transaction reference' })
  @IsString()
  @IsOptional()
  paymentReference?: string;

  @ApiProperty({ description: 'Amount paid', default: 0 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ description: 'Admin notes' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ description: 'Expiration date' })
  @IsOptional()
  expiresAt?: Date;
}
