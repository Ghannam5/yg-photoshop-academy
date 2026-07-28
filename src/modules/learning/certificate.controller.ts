import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Public } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CertificateService } from './certificate.service';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List the current user certificates' })
  @ApiResponse({ status: 200, description: 'User certificates.' })
  async mine(@CurrentUser() user: AuthenticatedUser) {
    return this.certificateService.listMine(user.id);
  }

  @Public()
  @Get('verify/:code')
  @ApiOperation({ summary: 'Publicly verify a certificate by number or verification code' })
  @ApiResponse({ status: 200, description: 'Certificate verification result.' })
  @ApiResponse({ status: 404, description: 'Certificate not found.' })
  async verify(@Param('code') code: string) {
    return this.certificateService.verify(code);
  }
}
