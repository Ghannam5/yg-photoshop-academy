import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllRoles() {
    return this.prisma.role.findMany({
      include: {
        _count: {
          select: { permissions: true, users: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    });
  }

  async getRolePermissions(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return {
      role: {
        id: role.id,
        name: role.name,
        description: role.description,
      },
      permissions: role.permissions.map((rp) => rp.permission),
    };
  }

  async assignPermissionsToRole(roleId: string, permissionIds: string[]) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Delete current permissions
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Assign new permissions
    const data = permissionIds.map((permissionId) => ({
      roleId,
      permissionId,
    }));

    await this.prisma.rolePermission.createMany({
      data,
    });

    return this.getRolePermissions(roleId);
  }

  async getUserPermissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roleRef: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If admin, return all system permissions
    if (user.role === 'ADMIN') {
      const allPermissions = await this.prisma.permission.findMany();
      return {
        role: user.role,
        isSuperAdmin: true,
        permissions: allPermissions,
      };
    }

    const permissions = user.roleRef?.permissions.map((rp) => rp.permission) || [];

    return {
      role: user.role,
      isSuperAdmin: false,
      permissions,
    };
  }
}
