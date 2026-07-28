import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
export const Public = () => SetMetadata('isPublic', true);
