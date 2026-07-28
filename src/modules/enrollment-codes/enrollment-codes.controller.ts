import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EnrollmentCodesService } from './enrollment-codes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../auth/decorators';
import { CreateCodeDto, BulkCreateCodesDto, RedeemCodeDto, CodeQueryDto } from './dto';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('Enrollment Codes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class EnrollmentCodesController {
  constructor(private readonly codesService: EnrollmentCodesService) {}

  @Roles('ADMIN')
  @Post('admin/codes')
  @ApiOperation({ summary: 'Generate a single enrollment code' })
  generateCode(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCodeDto) {
    return this.codesService.generateCode(user.id, dto);
  }

  @Roles('ADMIN')
  @Post('admin/codes/bulk')
  @ApiOperation({ summary: 'Generate multiple enrollment codes' })
  generateBulkCodes(@CurrentUser() user: AuthenticatedUser, @Body() dto: BulkCreateCodesDto) {
    return this.codesService.generateBulkCodes(user.id, dto);
  }

  @Roles('ADMIN')
  @Get('admin/codes')
  @ApiOperation({ summary: 'List enrollment codes' })
  listCodes(@Query() query: CodeQueryDto) {
    return this.codesService.listCodes(query);
  }

  @Roles('ADMIN')
  @Get('admin/codes/stats')
  @ApiOperation({ summary: 'Get enrollment code statistics' })
  getStats() {
    return this.codesService.getStats();
  }

  @Roles('ADMIN')
  @Get('admin/codes/:id')
  @ApiOperation({ summary: 'Get enrollment code details' })
  getCodeById(@Param('id') id: string) {
    return this.codesService.getCodeById(id);
  }

  @Roles('ADMIN')
  @Patch('admin/codes/:id/revoke')
  @ApiOperation({ summary: 'Revoke an enrollment code' })
  revokeCode(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.codesService.revokeCode(user.id, id);
  }

  @Post('enrollments/redeem')
  @ApiOperation({ summary: 'Redeem an enrollment code' })
  redeemCode(@CurrentUser() user: AuthenticatedUser, @Body() dto: RedeemCodeDto) {
    return this.codesService.redeemCode(user.id, dto.code);
  }
}
