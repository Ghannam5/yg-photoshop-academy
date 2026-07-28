import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private readonly fromAddress: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.fromAddress = this.config.get<string>('SMTP_FROM') ?? 'noreply@ygacademy.com';
    this.frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
  }

  onModuleInit(): void {
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      this.logger.warn('SMTP is not configured. Outgoing emails will be logged instead of sent.');
      return;
    }
    const port = parseInt(this.config.get<string>('SMTP_PORT') ?? '587', 10);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASSWORD');
    this.transporter = createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  getFrontendUrl(): string {
    return this.frontendUrl;
  }

  async sendTemplate(slug: string, to: string, variables: Record<string, string>): Promise<void> {
    try {
      const template = await this.prisma.emailTemplate.findFirst({
        where: { slug, isActive: true, deletedAt: null },
      });
      if (!template) {
        this.logger.warn(`Email template not found or inactive: ${slug}`);
        return;
      }
      const subject = this.render(template.subject, variables);
      const html = this.render(template.htmlContent, variables);
      const text = template.textContent ? this.render(template.textContent, variables) : undefined;

      if (this.transporter) {
        await this.transporter.sendMail({ from: this.fromAddress, to, subject, html, text });
        this.logger.log(`Email sent (${slug}) to ${to}`);
      } else {
        this.logger.log(`[MAIL:${slug}] to=${to} subject="${subject}"`);
      }
    } catch (error) {
      this.logger.error(`Failed to send email (${slug}) to ${to}`, (error as Error).stack);
    }
  }

  private render(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => variables[key] ?? match);
  }
}
