import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { AnalyticsService } from './analytics.service';

class SalesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number = 30;
}

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Platform overview: revenue, students, completion, top courses' })
  @ApiResponse({ status: 200, description: 'Analytics overview.' })
  async overview() {
    return this.analyticsService.overview();
  }

  @Get('sales')
  @ApiOperation({ summary: 'Daily sales series for the last N days' })
  @ApiResponse({ status: 200, description: 'Daily sales buckets.' })
  async sales(@Query() query: SalesQueryDto) {
    return this.analyticsService.salesByDay(query.days ?? 30);
  }
}
