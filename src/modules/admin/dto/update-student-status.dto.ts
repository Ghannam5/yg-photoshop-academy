import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserStatus } from '@prisma/client';

export class UpdateStudentStatusDto {
  @ApiProperty({ enum: UserStatus })
  @IsEnum(UserStatus)
  status!: UserStatus;
}
