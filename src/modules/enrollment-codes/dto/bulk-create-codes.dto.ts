import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ManualPaymentMethod } from '@prisma/client';

export class BulkCreateCodesDto {
  @ApiProperty({ description: 'Course ID' })
  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @ApiProperty({ description: 'Number of codes to generate', default: 10 })
  @IsNumber()
  @Min(1)
  count!: number;

  @ApiProperty({ enum: ManualPaymentMethod, default: 'CASH' })
  @IsEnum(ManualPaymentMethod)
  paymentMethod!: ManualPaymentMethod;

  @ApiPropertyOptional({ description: 'Amount paid per code', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amountPerCode?: number;

  @ApiPropertyOptional({ description: 'Admin notes' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ description: 'Expiration date' })
  @IsOptional()
  expiresAt?: Date;
}
