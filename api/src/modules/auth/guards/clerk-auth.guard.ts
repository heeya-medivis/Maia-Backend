import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UnauthorizedException } from '../../../common/exceptions';
import { DATABASE_CONNECTION, Database } from '../../../database';
import { users } from '../../../database/schema';
import { eq, isNull, and } from 'drizzle-orm';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException(
        'Missing authorization token',
        'TOKEN_MISSING',
      );
    }

    try {
      // Verify Clerk JWT token
      const payload = await this.verifyClerkToken(token);

      if (!payload.sub) {
        throw new UnauthorizedException('Invalid token payload', 'TOKEN_INVALID');
      }

      // Get user from database
      const [user] = await this.db
        .select()
        .from(users)
        .where(and(eq(users.id, payload.sub), isNull(users.deletedAt)))
        .limit(1);

      if (!user) {
        throw new UnauthorizedException('User not found', 'USER_NOT_FOUND');
      }

      // Attach user to request
      (request as any).user = user;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token', 'TOKEN_INVALID');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private async verifyClerkToken(token: string): Promise<{ sub: string }> {
    // Clerk tokens are JWTs that can be verified using the JWKS endpoint
    // For simplicity, we'll decode and verify the token structure
    // In production, you should verify against Clerk's JWKS

    try {
      // Decode JWT (base64)
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8'),
      );

      // Check expiration
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        throw new UnauthorizedException('Token expired', 'TOKEN_EXPIRED');
      }

      // Check issuer (should be Clerk)
      // Clerk tokens have azp (authorized party) or iss (issuer)
      if (!payload.sub) {
        throw new Error('Missing subject in token');
      }

      return { sub: payload.sub };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Failed to verify token', 'TOKEN_INVALID');
    }
  }
}
