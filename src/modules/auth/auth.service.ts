import { Injectable, UnauthorizedException, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('هذا البريد الإلكتروني مسجل بالفعل');
    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        firstName: dto.firstName,
        lastName: dto.lastName,
        emailVerified: true,
      },
    });
    
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN') || '15m',
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: hashedRefresh,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      message: 'تم إنشاء الحساب بنجاح',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async socialLogin(dto: { provider: string; email: string; firstName?: string; lastName?: string; avatarUrl?: string }) {
    let user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashed = await bcrypt.hash(randomPassword, 10);
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hashed,
          firstName: dto.firstName || dto.email.split('@')[0],
          lastName: dto.lastName || '',
          avatarUrl: dto.avatarUrl,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN') || '15m',
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: hashedRefresh,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async login(dto: LoginDto, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN') || '15m',
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: hashedRefresh,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastLoginIp: ip } });
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    return { message: 'Logged out successfully' };
  }

  async getMe(userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        emailVerified: true,
        status: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email, deletedAt: null } });
    let resetToken = null;
    if (user) {
      resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await bcrypt.hash(resetToken, 10);
      
      await this.prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: `RESET-${hashedToken}`,
          expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
        },
      });

      const frontendUrl = this.mailService.getFrontendUrl();
      const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

      await this.mailService.sendTemplate('password-reset', user.email, {
        firstName: user.firstName,
        resetLink,
      });
    }

    return { 
      message: 'إذا كان البريد الإلكتروني مسجلاً لدينا، فقد تم إرسال رابط وإرشادات استعادة كلمة المرور إلى بريدك الإلكتروني.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { 
        token: { startsWith: 'RESET-' },
        isRevoked: false,
        expiresAt: { gt: new Date() }
      },
      include: { user: true }
    });

    let validTokenRecord = null;
    let userId = null;

    for (const record of tokens) {
      const actualHash = record.token.replace('RESET-', '');
      const isValid = await bcrypt.compare(token, actualHash);
      if (isValid) {
        validTokenRecord = record;
        userId = record.userId;
        break;
      }
    }

    if (!validTokenRecord || !userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { password: hashed }
      }),
      this.prisma.refreshToken.update({
        where: { id: validTokenRecord.id },
        data: { isRevoked: true }
      })
    ]);

    return { message: 'Password reset successful' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new BadRequestException('Current password is incorrect');
    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    return { message: 'Password changed successfully' };
  }

  async sendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');
    if (user.emailVerified) throw new BadRequestException('Email is already verified');

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(rawToken, 10);
    
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: `VERIFY-${hashedToken}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    const frontendUrl = this.mailService.getFrontendUrl();
    const verifyLink = `${frontendUrl}/verify-email?token=${rawToken}`;

    await this.mailService.sendTemplate('email-verification', user.email, {
      firstName: user.firstName,
      verifyLink,
    });

    return { message: 'Verification email sent' };
  }

  async verifyEmail(token: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { 
        token: { startsWith: 'VERIFY-' },
        isRevoked: false,
        expiresAt: { gt: new Date() }
      },
      include: { user: true }
    });

    let validTokenRecord = null;
    let userId = null;

    for (const record of tokens) {
      const actualHash = record.token.replace('VERIFY-', '');
      const isValid = await bcrypt.compare(token, actualHash);
      if (isValid) {
        validTokenRecord = record;
        userId = record.userId;
        break;
      }
    }

    if (!validTokenRecord || !userId) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { 
          emailVerified: true,
          emailVerifiedAt: new Date(),
          status: 'ACTIVE'
        }
      }),
      this.prisma.refreshToken.update({
        where: { id: validTokenRecord.id },
        data: { isRevoked: true }
      })
    ]);

    return { message: 'Email verified successfully' };
  }

  async requestSocialOtp(dto: { provider: string; email: string; firstName?: string; lastName?: string }) {
    let user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashed = await bcrypt.hash(randomPassword, 10);
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hashed,
          firstName: dto.firstName || dto.email.split('@')[0],
          lastName: dto.lastName || '',
          emailVerified: false,
        },
      });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otpCode, 10);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: `OTP-${hashedOtp}`,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await this.mailService.sendTemplate('email-verification', user.email, {
      firstName: user.firstName,
      verifyLink: `كود التأكيد الخاص بك هو: ${otpCode}`,
    });

    return {
      message: 'تم إرسال كود التأكيد إلى بريدك الإلكتروني',
      email: user.email,
      otpCode,
    };
  }

  async verifySocialOtp(dto: { email: string; code: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    const records = await this.prisma.refreshToken.findMany({
      where: {
        userId: user.id,
        token: { startsWith: 'OTP-' },
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    let isValid = false;
    let validRecordId = null;

    for (const rec of records) {
      const actualHash = rec.token.replace('OTP-', '');
      const match = await bcrypt.compare(dto.code, actualHash);
      if (match) {
        isValid = true;
        validRecordId = rec.id;
        break;
      }
    }

    if (!isValid) {
      throw new BadRequestException('كود التأكيد غير صحيح أو منتهي الصلاحية');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, emailVerifiedAt: new Date(), status: 'ACTIVE' },
      }),
      this.prisma.refreshToken.update({
        where: { id: validRecordId },
        data: { isRevoked: true },
      }),
    ]);

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN') || '15m',
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: hashedRefresh,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      message: 'تم تأكيد الحساب وتسجيل الدخول بنجاح',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }
}
