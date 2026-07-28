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
    if (existing) throw new ConflictException('Email already registered');
    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });
    
    // Automatically send verification email on register
    await this.sendVerificationEmail(user.id);

    return { message: 'Registration successful. Please verify your email.' };
  }

  async login(dto: LoginDto, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
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
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await bcrypt.hash(rawToken, 10);
      
      await this.prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: `RESET-${hashedToken}`,
          expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
        },
      });

      const frontendUrl = this.mailService.getFrontendUrl();
      const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

      await this.mailService.sendTemplate('password-reset', user.email, {
        firstName: user.firstName,
        resetLink,
      });
    }

    return { message: 'If that email is registered, a reset link has been sent.' };
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
}
