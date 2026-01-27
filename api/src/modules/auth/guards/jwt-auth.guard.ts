import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { UnauthorizedException } from '../../../common/exceptions';
import { type AuthUser } from '../../../common';
import { SessionService } from '../services/session.service';
import { DATABASE_CONNECTION, Database } from '../../../database';
import { users } from '../../../database/schema';
import { eq, isNull, and } from 'drizzle-orm';

/**
 * Guard that validates our own JWT access tokens.
 * Used for all authenticated endpoints called by Unity.
 *
 * Populates request.user with AuthUser containing:
 * - User identity (id, email)
 * - isSuperAdmin flag (from database)
 * - Session/device info
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly sessionService: SessionService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    const deviceId = request.headers['x-device-id'] as string;

    if (!token) {
      this.logger.warn('Missing authorization token');
      throw new UnauthorizedException(
        'Missing authorization token',
        'TOKEN_MISSING',
      );
    }

    try {
      // Verify our JWT token
      const payload = await this.sessionService.verifyAccessToken(token);

      // Validate session is still active (not revoked)
      const isValid = await this.sessionService.validateSession(payload.sid);
      if (!isValid) {
        this.logger.warn(`Session ${payload.sid} is revoked or invalid`);
        throw new UnauthorizedException('Session revoked', 'SESSION_REVOKED');
      }

      // Optionally verify device ID matches
      if (deviceId && deviceId !== payload.did) {
        this.logger.warn(
          `Device ID mismatch: header=${deviceId}, token=${payload.did}`,
        );
        throw new UnauthorizedException('Device mismatch', 'DEVICE_MISMATCH');
      }

      // Fetch full user from database
      const [user] = await this.db
        .select()
        .from(users)
        .where(and(eq(users.id, payload.sub), isNull(users.deletedAt)))
        .limit(1);

      if (!user) {
        this.logger.warn(`User not found: ${payload.sub}`);
        throw new UnauthorizedException('User not found', 'USER_NOT_FOUND');
      }

      // Build AuthUser object
      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin === true,
        sessionId: payload.sid,
        deviceId: payload.did,
      };

      // Attach AuthUser to request
      (request as any).user = authUser;
      // Also attach raw user for backwards compatibility
      (request as any).dbUser = user;
      (request as any).session = {
        sessionId: payload.sid,
        deviceId: payload.did,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn(`Token verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid token', 'TOKEN_INVALID');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
