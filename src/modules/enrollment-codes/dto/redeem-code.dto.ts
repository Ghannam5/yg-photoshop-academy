import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RedeemCodeDto {
  @ApiProperty({ description: 'Enrollment code to redeem' })
  @IsString()
  @IsNotEmpty()
  code!: string;
}
