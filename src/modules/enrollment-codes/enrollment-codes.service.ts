import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EnrollmentService } from '../learning/enrollment.service';
import { CreateCodeDto, BulkCreateCodesDto, CodeQueryDto } from './dto';
import * as crypto from 'crypto';
import { EnrollmentCodeStatus, ManualPaymentMethod } from '@prisma/client';

@Injectable()
export class EnrollmentCodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollmentService: EnrollmentService,
  ) {}

  private generateRandomString(length: number): string {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length).toUpperCase();
  }

  private generateCodeString(): string {
    return `YG-${this.generateRandomString(8)}`;
  }

  private generateInvoiceNumber(): string {
    const date = new Date();
    const yyyymmdd = date.toISOString().split('T')[0].replace(/-/g, '');
    const random = this.generateRandomString(5);
    return `INV-${yyyymmdd}-${random}`;
  }

  async generateCode(adminId: string, dto: CreateCodeDto) {
    const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const codeStr = this.generateCodeString();

    const result = await this.prisma.$transaction(async (tx) => {
      const code = await tx.enrollmentCode.create({
        data: {
          code: codeStr,
          courseId: dto.courseId,
          createdById: adminId,
          studentEmail: dto.studentEmail,
          studentName: dto.studentName,
          paymentMethod: dto.paymentMethod,
          paymentReference: dto.paymentReference,
          amount: dto.amount,
          note: dto.note,
          expiresAt: dto.expiresAt,
        },
      });

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: this.generateInvoiceNumber(),
          enrollmentCodeId: code.id,
          studentName: dto.studentName || 'Unknown Student',
          studentEmail: dto.studentEmail || 'unknown@example.com',
          courseName: course.title,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          paymentReference: dto.paymentReference,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'CODE_GENERATE',
          entity: 'EnrollmentCode',
          details: { codeId: code.id, courseId: dto.courseId, invoiceId: invoice.id },
        },
      });

      return code;
    });

    return result;
  }

  async generateBulkCodes(adminId: string, dto: BulkCreateCodesDto) {
    const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const codes = [];
    const amount = dto.amountPerCode ?? 0;

    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < dto.count; i++) {
        const codeStr = this.generateCodeString();
        
        const code = await tx.enrollmentCode.create({
          data: {
            code: codeStr,
            courseId: dto.courseId,
            createdById: adminId,
            paymentMethod: dto.paymentMethod,
            amount: amount,
            note: dto.note,
            expiresAt: dto.expiresAt,
          },
        });

        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber: this.generateInvoiceNumber(),
            enrollmentCodeId: code.id,
            studentName: 'Bulk Code User',
            studentEmail: 'bulk@example.com',
            courseName: course.title,
            amount: amount,
            paymentMethod: dto.paymentMethod,
          },
        });

        codes.push(code);
      }

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'CODE_GENERATE',
          entity: 'EnrollmentCode',
          details: { courseId: dto.courseId, count: dto.count, bulk: true },
        },
      });
    });

    return codes;
  }

  async redeemCode(userId: string, codeStr: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const code = await this.prisma.enrollmentCode.findUnique({
      where: { code: codeStr },
      include: { course: true, invoice: true }
    });

    if (!code) throw new NotFoundException('Invalid enrollment code');
    if (code.status !== EnrollmentCodeStatus.ACTIVE) throw new BadRequestException(`Code is ${code.status}`);
    if (code.expiresAt && code.expiresAt < new Date()) {
      await this.prisma.enrollmentCode.update({ where: { id: code.id }, data: { status: EnrollmentCodeStatus.EXPIRED } });
      throw new BadRequestException('Code has expired');
    }
    
    if (code.studentEmail && code.studentEmail.toLowerCase() !== user.email.toLowerCase()) {
      throw new BadRequestException('Code is restricted to another email address');
    }

    const enrollment = await this.enrollmentService.enroll(userId, code.courseId, code.id);

    return enrollment;
  }

  async listCodes(query: CodeQueryDto) {
    const { courseId, search, status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (courseId) where.courseId = courseId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { studentName: { contains: search, mode: 'insensitive' } },
        { studentEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, codes] = await Promise.all([
      this.prisma.enrollmentCode.count({ where }),
      this.prisma.enrollmentCode.findMany({
        where,
        skip,
        take: limit,
        include: {
          course: { select: { id: true, title: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          usedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          invoice: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    ]);

    return { data: codes, total, page, limit };
  }

  async getCodeById(id: string) {
    const code = await this.prisma.enrollmentCode.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        usedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        invoice: true,
      },
    });
    if (!code) throw new NotFoundException('Code not found');
    return code;
  }

  async revokeCode(adminId: string, codeId: string) {
    const code = await this.prisma.enrollmentCode.findUnique({ where: { id: codeId } });
    if (!code) throw new NotFoundException('Code not found');
    if (code.status !== EnrollmentCodeStatus.ACTIVE) throw new BadRequestException(`Cannot revoke ${code.status} code`);

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.enrollmentCode.update({
        where: { id: codeId },
        data: { status: EnrollmentCodeStatus.REVOKED },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'CODE_REVOKE',
          entity: 'EnrollmentCode',
          details: { codeId },
        },
      });

      return updated;
    });

    return result;
  }

  async getStats() {
    const [total, used, active, expired, revoked] = await Promise.all([
      this.prisma.enrollmentCode.count(),
      this.prisma.enrollmentCode.count({ where: { status: EnrollmentCodeStatus.USED } }),
      this.prisma.enrollmentCode.count({ where: { status: EnrollmentCodeStatus.ACTIVE } }),
      this.prisma.enrollmentCode.count({ where: { status: EnrollmentCodeStatus.EXPIRED } }),
      this.prisma.enrollmentCode.count({ where: { status: EnrollmentCodeStatus.REVOKED } }),
    ]);

    const revenueByMethodRaw = await this.prisma.enrollmentCode.groupBy({
      by: ['paymentMethod'],
      _sum: { amount: true },
      where: { status: { in: [EnrollmentCodeStatus.USED, EnrollmentCodeStatus.ACTIVE] } }
    });

    const revenueByMethod = revenueByMethodRaw.map(r => ({
      method: r.paymentMethod,
      amount: r._sum.amount || 0,
    }));

    return { total, used, active, expired, revoked, revenueByMethod };
  }
}
