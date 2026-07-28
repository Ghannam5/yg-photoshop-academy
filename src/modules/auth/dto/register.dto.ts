import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty() @IsString() @MaxLength(50) firstName: string;
  @ApiProperty() @IsString() @MaxLength(50) lastName: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(8) password: string;
}
