import { Injectable } from '@nestjs/common';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthMailService {
  constructor(private readonly mail: MailService) {}

  async sendVerificationEmail(email: string, firstName: string, token: string): Promise<void> {
    const verifyUrl = `${this.mail.getFrontendUrl()}/verify-email?token=${encodeURIComponent(token)}`;
    await this.mail.sendTemplate('email-verification', email, { name: firstName, verifyUrl });
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    await this.mail.sendTemplate('welcome', email, { name: firstName });
  }

  async sendPasswordResetEmail(email: string, firstName: string, token: string): Promise<void> {
    const resetUrl = `${this.mail.getFrontendUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    await this.mail.sendTemplate('password-reset', email, { name: firstName, resetUrl });
  }

  async sendPasswordChangedEmail(email: string, firstName: string): Promise<void> {
    await this.mail.sendTemplate('password-changed', email, { name: firstName });
  }
}
