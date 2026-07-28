import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RbacController],
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}
