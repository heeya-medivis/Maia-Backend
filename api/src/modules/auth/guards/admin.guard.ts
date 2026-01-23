import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { ForbiddenException } from '../../../common/exceptions';
import { User } from '../../../database/schema';

/**
 * Guard to check if user has admin role
 * For now, we'll use a simple check - in production you might want
 * to check Clerk metadata or a roles table
 */
@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user as User | undefined;

    if (!user) {
      throw new ForbiddenException('User not found', 'USER_NOT_FOUND');
    }

    // Check if user is admin
    // Option 1: Check Clerk public metadata (set via Clerk dashboard)
    // Option 2: Check a roles column in users table
    // Option 3: Check a separate user_roles table
    
    // For now, we'll check if the user's email is in a list of admin emails
    // You should replace this with proper role checking
    const isAdmin = await this.checkIsAdmin(user);

    if (!isAdmin) {
      throw new ForbiddenException(
        'Admin access required',
        'ADMIN_ACCESS_REQUIRED',
      );
    }

    return true;
  }

  private async checkIsAdmin(user: User): Promise<boolean> {
    // TODO: Implement proper admin check
    // Options:
    // 1. Check Clerk session claims for role
    // 2. Add isAdmin column to users table
    // 3. Create separate roles/permissions table
    
    // For development, you can temporarily allow all authenticated users
    // or check against a list of admin emails
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') ?? [];
    
    return adminEmails.includes(user.email);
  }
}
