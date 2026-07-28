import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString } from 'class-validator';
import { ContactStatus } from '@prisma/client';

export class CreateContactDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  subject!: string;

  @ApiProperty()
  @IsString()
  message!: string;
}

export class UpdateContactStatusDto {
  @ApiProperty({ enum: ContactStatus })
  @IsEnum(ContactStatus)
  status!: ContactStatus;
}
