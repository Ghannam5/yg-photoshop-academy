import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Access denied: User unauthenticated');
    }

    // Admins bypass granular permission checks
    if (user.role === 'ADMIN') {
      return true;
    }

    // Fetch user permissions through roleRef or role name
    let roleId = user.roleId;

    if (!roleId) {
      const roleRecord = await this.prisma.role.findUnique({
        where: { name: user.role },
        select: { id: true },
      });
      roleId = roleRecord?.id;
    }

    if (!roleId) {
      throw new ForbiddenException('Access denied: No role permissions found for user');
    }

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });

    const userPermissionNames = rolePermissions.map((rp) => rp.permission.name);

    const hasPermission = requiredPermissions.every((perm) =>
      userPermissionNames.includes(perm),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied: Missing required permission(s): ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
