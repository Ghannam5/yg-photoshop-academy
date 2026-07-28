import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { BannerPosition } from '@prisma/client';

export class CreateBannerDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  imageUrl!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  linkUrl?: string;

  @ApiPropertyOptional({ enum: BannerPosition, default: BannerPosition.HOME_TOP })
  @IsEnum(BannerPosition)
  @IsOptional()
  position?: BannerPosition = BannerPosition.HOME_TOP;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @ApiPropertyOptional({ default: 0 })
  @IsNumber()
  @IsOptional()
  order?: number = 0;
}

export class UpdateBannerDto extends PartialType(CreateBannerDto) {}
