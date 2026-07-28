import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SupportStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateReplyDto,
  CreateTicketDto,
  TicketQueryDto,
  UpdateTicketStatusDto,
} from './dto/support.dto';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(userId: string, dto: CreateTicketDto) {
    const ticketNumber = this.generateTicketNumber();
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.create({
        data: {
          userId,
          ticketNumber,
          subject: dto.subject,
          status: SupportStatus.OPEN,
          priority: dto.priority ?? 'MEDIUM',
          category: dto.category ?? null,
        },
      });
      await tx.supportReply.create({
        data: {
          ticketId: ticket.id,
          userId,
          message: dto.message,
          isInternal: false,
        },
      });
      return tx.supportTicket.findUniqueOrThrow({
        where: { id: ticket.id },
        include: { replies: true },
      });
    });
  }

  async listMine(userId: string, query: TicketQueryDto) {
    return this.listTickets({ userId }, query, false);
  }

  async listAll(query: TicketQueryDto) {
    return this.listTickets({}, query, true);
  }

  async getTicket(id: string, userId: string, isAdmin: boolean) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, ...(isAdmin ? {} : { userId }) },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        replies: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });
    if (!ticket) throw new NotFoundException('TICKETNOTFOUND');

    const replies = isAdmin ? ticket.replies : ticket.replies.filter((r) => !r.isInternal);
    return { ...ticket, replies };
  }

  async reply(id: string, userId: string, dto: CreateReplyDto, isAdmin: boolean) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('TICKETNOTFOUND');
    if (!isAdmin && ticket.userId !== userId) throw new ForbiddenException('TICKETNOTOWNED');

    const isInternal = isAdmin ? (dto.isInternal ?? false) : false;

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.supportReply.create({
        data: { ticketId: id, userId, message: dto.message, isInternal },
      });
      if (!isAdmin && ticket.status === SupportStatus.RESOLVED) {
        await tx.supportTicket.update({
          where: { id },
          data: { status: SupportStatus.IN_PROGRESS, resolvedAt: null },
        });
      }
      return created;
    });
  }

  async updateStatus(id: string, dto: UpdateTicketStatusDto) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('TICKETNOTFOUND');

    const now = new Date();
    const data: Prisma.SupportTicketUpdateInput = { status: dto.status as SupportStatus };
    if (dto.status === 'RESOLVED') data.resolvedAt = now;
    if (dto.status === 'CLOSED') {
      data.closedAt = now;
      if (!ticket.resolvedAt) data.resolvedAt = now;
    }

    return this.prisma.supportTicket.update({ where: { id }, data });
  }

  private async listTickets(
    baseWhere: Prisma.SupportTicketWhereInput,
    query: TicketQueryDto,
    includeUser: boolean,
  ) {
    const where: Prisma.SupportTicketWhereInput = {
      ...baseWhere,
      ...(query.status ? { status: query.status as SupportStatus } : {}),
    };
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [total, tickets] = await this.prisma.$transaction([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.findMany({
        where,
        include: {
          ...(includeUser
            ? { user: { select: { id: true, email: true, firstName: true, lastName: true } } }
            : {}),
          replies: { select: { id: true, createdAt: true, isInternal: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: tickets.map((t) => ({
        ...t,
        replyCount: t.replies.length,
        replies: undefined,
      })),
      meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    };
  }

  private generateTicketNumber(): string {
    const time = Date.now().toString(36).toUpperCase();
    const rand = randomBytes(2).toString('hex').toUpperCase();
    return `TKT-${time}-${rand}`;
  }
}
