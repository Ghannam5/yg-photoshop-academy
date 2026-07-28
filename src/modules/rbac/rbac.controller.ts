import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { RbacService } from './rbac.service';

@ApiTags('RBAC')
@Controller('admin/rbac')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth('JWT-Auth')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('roles')
  @ApiOperation({ summary: 'List all roles with permission and user counts' })
  @ApiResponse({ status: 200, description: 'List of roles.' })
  async getRoles() {
    return this.rbacService.getAllRoles();
  }

  @Get('permissions')
  @ApiOperation({ summary: 'List all available permissions' })
  @ApiResponse({ status: 200, description: 'List of permissions.' })
  async getPermissions() {
    return this.rbacService.getAllPermissions();
  }

  @Get('roles/:roleId/permissions')
  @ApiOperation({ summary: 'Get permissions assigned to a specific role' })
  @ApiResponse({ status: 200, description: 'Role with its permissions.' })
  @ApiResponse({ status: 404, description: 'Role not found.' })
  async getRolePermissions(@Param('roleId') roleId: string) {
    return this.rbacService.getRolePermissions(roleId);
  }

  @Put('roles/:roleId/permissions')
  @ApiOperation({ summary: 'Assign permissions to a role (replaces existing)' })
  @ApiResponse({ status: 200, description: 'Updated role permissions.' })
  @ApiResponse({ status: 404, description: 'Role not found.' })
  async assignPermissions(
    @Param('roleId') roleId: string,
    @Body() body: { permissionIds: string[] },
  ) {
    return this.rbacService.assignPermissionsToRole(roleId, body.permissionIds);
  }

  @Get('users/:userId/permissions')
  @ApiOperation({ summary: 'Get effective permissions for a specific user' })
  @ApiResponse({ status: 200, description: 'User permissions.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getUserPermissions(@Param('userId') userId: string) {
    return this.rbacService.getUserPermissions(userId);
  }
}
