import { Injectable, NotFoundException } from '@nestjs/common';
import { CertificateStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CertificateService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(userId: string) {
    return this.prisma.certificate.findMany({
      where: { userId, status: CertificateStatus.ISSUED },
      include: {
        enrollment: {
          select: {
            course: { select: { id: true, title: true, slug: true, thumbnailUrl: true } },
            completedAt: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async verify(code: string) {
    const certificate = await this.prisma.certificate.findFirst({
      where: {
        OR: [{ certificateNumber: code }, { verificationCode: code }],
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        enrollment: {
          select: {
            completedAt: true,
            course: { select: { title: true, slug: true } },
          },
        },
      },
    });

    if (!certificate) {
      throw new NotFoundException('CERTIFICATENOTFOUND');
    }

    return {
      valid: certificate.status === CertificateStatus.ISSUED,
      status: certificate.status,
      certificateNumber: certificate.certificateNumber,
      issuedAt: certificate.issuedAt,
      revokedAt: certificate.revokedAt,
      holder: certificate.user,
      course: certificate.enrollment.course,
      completedAt: certificate.enrollment.completedAt,
    };
  }
}
