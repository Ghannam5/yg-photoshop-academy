import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import type {
  CreateReplyDto,
  CreateTicketDto,
  TicketQueryDto,
  UpdateTicketStatusDto,
} from './dto/support.dto';
import { SupportService } from './support.service';

@ApiTags('Support')
@Controller('support')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  @ApiOperation({ summary: 'Open a new support ticket with the first reply' })
  @ApiResponse({ status: 201, description: 'Ticket created.' })
  async create(@Body() dto: CreateTicketDto, @CurrentUser() user: AuthenticatedUser) {
    return this.supportService.createTicket(user.id, dto);
  }

  @Get('tickets/me')
  @ApiOperation({ summary: 'List the current user tickets' })
  async mine(@Query() query: TicketQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.supportService.listMine(user.id, query);
  }

  @Get('tickets')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all support tickets (admin)' })
  async all(@Query() query: TicketQueryDto) {
    return this.supportService.listAll(query);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get a ticket with its replies (internal replies hidden for students)' })
  async getOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.supportService.getTicket(id, user.id, user.role === 'ADMIN');
  }

  @Post('tickets/:id/replies')
  @ApiOperation({ summary: 'Add a reply to a ticket' })
  async reply(
    @Param('id') id: string,
    @Body() dto: CreateReplyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.supportService.reply(id, user.id, dto, user.role === 'ADMIN');
  }

  @Patch('tickets/:id/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a ticket status (admin)' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateTicketStatusDto) {
    return this.supportService.updateStatus(id, dto);
  }
}
