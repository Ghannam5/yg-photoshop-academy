import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EnrollmentCodeStatus } from '@prisma/client';

@Injectable()
export class CleanupTask {
  private readonly logger = new Logger(CleanupTask.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Clean expired refresh tokens every day at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanExpiredTokens(): Promise<void> {
    try {
      const result = await this.prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { isRevoked: true, createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          ],
        },
      });
      if (result.count > 0) {
        this.logger.log(`Cleaned ${result.count} expired/revoked refresh tokens`);
      }
    } catch (error) {
      this.logger.error('Failed to clean expired tokens', (error as Error).stack);
    }
  }

  /**
   * Clean expired user sessions every day at 1 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async cleanExpiredSessions(): Promise<void> {
    try {
      const result = await this.prisma.userSession.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { isValid: false, createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          ],
        },
      });
      if (result.count > 0) {
        this.logger.log(`Cleaned ${result.count} expired/invalid sessions`);
      }
    } catch (error) {
      this.logger.error('Failed to clean expired sessions', (error as Error).stack);
    }
  }

  /**
   * Expire enrollment codes that have passed their expiresAt date — every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireEnrollmentCodes(): Promise<void> {
    try {
      const result = await this.prisma.enrollmentCode.updateMany({
        where: {
          status: EnrollmentCodeStatus.ACTIVE,
          expiresAt: { lt: new Date() },
        },
        data: {
          status: EnrollmentCodeStatus.EXPIRED,
        },
      });
      if (result.count > 0) {
        this.logger.log(`Expired ${result.count} enrollment codes`);
      }
    } catch (error) {
      this.logger.error('Failed to expire enrollment codes', (error as Error).stack);
    }
  }

  /**
   * Clean old audit logs (older than 90 days) — every Sunday at 2 AM
   */
  @Cron('0 2 * * 0')
  async cleanOldAuditLogs(): Promise<void> {
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const result = await this.prisma.auditLog.deleteMany({
        where: {
          createdAt: { lt: ninetyDaysAgo },
        },
      });
      if (result.count > 0) {
        this.logger.log(`Cleaned ${result.count} audit logs older than 90 days`);
      }
    } catch (error) {
      this.logger.error('Failed to clean old audit logs', (error as Error).stack);
    }
  }
}
