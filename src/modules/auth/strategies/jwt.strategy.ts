import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || 'fallback_secret_key',
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        emailVerified: true,
        status: true,
      },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
    };
  }
}
