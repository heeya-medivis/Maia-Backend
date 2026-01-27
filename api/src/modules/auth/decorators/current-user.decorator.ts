import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../../database/schema';

/**
 * Parameter decorator that extracts the current authenticated user from the request.
 * 
 * The JwtAuthGuard stores:
 * - request.user = AuthUser (minimal auth info: id, email, isAdmin, sessionId, deviceId)
 * - request.dbUser = Full User record from database (includes firstName, lastName, imageUrl, etc.)
 * 
 * This decorator returns the full User record (dbUser) for use in controllers.
 * 
 * @example
 * // Get full user
 * @CurrentUser() user: User
 * 
 * // Get specific field
 * @CurrentUser('email') email: string
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext): User | any => {
    const request = ctx.switchToHttp().getRequest();
    // Use dbUser which contains the full user record from database
    const user = request.dbUser as User;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
