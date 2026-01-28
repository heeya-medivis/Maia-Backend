import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { ForbiddenException } from '../../../common/exceptions';
import { type AuthUser } from '../../../common';

/**
 * Guard to check if user is an admin
 * Admins have full platform access (Maia company employees)
 *
 * The isAdmin flag comes from the users.is_admin column
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user as AuthUser | undefined;

    if (!user) {
      throw new ForbiddenException('User not found', 'USER_NOT_FOUND');
    }

    if (!user.isAdmin) {
      throw new ForbiddenException(
        'Admin access required',
        'ADMIN_ACCESS_REQUIRED',
      );
    }

    return true;
  }
}


