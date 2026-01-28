import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { nanoid } from 'nanoid';
import * as crypto from 'crypto';
import { SessionRepository } from '../repositories/session.repository';
import { DevicesRepository } from '../repositories/devices.repository';
import {
  signAccessToken,
  verifyAccessToken as jwtVerifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashRefreshToken,
  initializeJwt,
  type AccessTokenClaims,
} from '../../../utils/jwt';
import type { AuthProtocol } from '../../../database/schema/auth-connections';

export interface CreateSessionInput {
  userId: string;
  deviceId?: string;
  devicePlatform?: string;
  authMethod: AuthProtocol;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
}

export interface RefreshSessionInput {
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AccessTokenPayload {
  sub: string; // userId
  sid: string; // sessionId
  did: string; // deviceId
  tid?: string; // tenantId (optional, for multi-tenancy)
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly refreshTokenTtlSeconds: number;

  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly devicesRepository: DevicesRepository,
    private readonly configService: ConfigService,
  ) {
    // Initialize JWT utilities with config service
    initializeJwt(configService);
    this.refreshTokenTtlSeconds = this.configService.get<number>('REFRESH_TOKEN_TTL_SECONDS', 2592000);
  }

  /**
   * Create a new session and return access/refresh tokens
   * Uses refresh token family for rotation detection
   */
  async createSession(input: CreateSessionInput): Promise<SessionTokens> {
    // Auto-register or update device if deviceId is provided
    if (input.deviceId) {
      const { platform, deviceType } = this.mapPlatformAndDeviceType(input.devicePlatform);
      await this.devicesRepository.upsert({
        id: input.deviceId,
        userId: input.userId,
        platform,
        deviceType,
      });
      this.logger.log(`Device ${input.deviceId} registered/updated for user ${input.userId} (type: ${deviceType}, platform: ${platform})`);
    }

    // Check for existing active session for this user/device and revoke it
    if (input.deviceId) {
      const existingSession = await this.sessionRepository.findActiveByUserAndDevice(
        input.userId,
        input.deviceId,
      );

      if (existingSession) {
        await this.sessionRepository.revoke(existingSession.id, 'new_session');
        this.logger.log(`Revoked existing session ${existingSession.id} for device ${input.deviceId}`);
      }
    }

    const sessionId = nanoid();
    const familyId = nanoid();
    const refreshToken = generateRefreshToken(sessionId, familyId);
    const refreshTokenHash = hashRefreshToken(refreshToken);
    
    const accessTokenTtl = this.configService.get<number>('ACCESS_TOKEN_TTL_SECONDS', 600);
    const expiresAt = new Date(Date.now() + accessTokenTtl * 1000);
    const refreshExpiresAt = new Date(Date.now() + this.refreshTokenTtlSeconds * 1000);

    // Create session in database
    await this.sessionRepository.create({
      id: sessionId,
      userId: input.userId,
      deviceId: input.deviceId ?? null,
      refreshTokenHash,
      refreshTokenFamilyId: familyId,
      authMethod: input.authMethod,
      expiresAt: refreshExpiresAt,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });

    // Generate JWT access token
    const accessToken = await signAccessToken({
      sub: input.userId,
      sid: sessionId,
      did: input.deviceId,
    });

    this.logger.log(`Created session ${sessionId} for user ${input.userId}`);

    return {
      accessToken,
      refreshToken,
      expiresAt,
      refreshExpiresAt,
    };
  }

  /**
   * Refresh an expired session
   * Implements refresh token rotation with reuse detection
   */
  async refreshSession(input: RefreshSessionInput): Promise<SessionTokens> {
    // Verify HMAC signature and extract session/family IDs
    const verified = verifyRefreshToken(input.refreshToken);
    if (!verified) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { sid: sessionId, fid: familyId } = verified;

    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    if (session.revokedAt !== null) {
      throw new UnauthorizedException('Session has been revoked');
    }

    if (session.expiresAt < new Date()) {
      await this.sessionRepository.revoke(sessionId, 'expired');
      throw new UnauthorizedException('Refresh token expired');
    }

    // Verify family ID matches to detect token theft
    if (session.refreshTokenFamilyId !== familyId) {
      // Token family mismatch - potential token theft
      // Revoke all sessions for this device
      if (session.deviceId) {
        await this.sessionRepository.revokeByDeviceId(session.deviceId);
      }
      this.logger.warn(
        `Refresh token family mismatch for session ${sessionId}. Potential token theft detected.`,
      );
      throw new UnauthorizedException('Refresh token has been revoked due to suspected token theft');
    }

    // Verify the token hash matches
    const incomingHash = hashRefreshToken(input.refreshToken);
    if (incomingHash !== session.refreshTokenHash) {
      // Token reuse detected - revoke the session
      await this.sessionRepository.revoke(sessionId, 'rotation_reuse');
      this.logger.warn(
        `Refresh token reuse detected for session ${sessionId}. Revoking session.`,
      );
      throw new UnauthorizedException('Refresh token has been revoked due to reuse');
    }

    // Generate new tokens (rotate)
    const newRefreshToken = generateRefreshToken(sessionId, familyId);
    const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
    
    const accessTokenTtl = this.configService.get<number>('ACCESS_TOKEN_TTL_SECONDS', 600);
    const expiresAt = new Date(Date.now() + accessTokenTtl * 1000);
    const refreshExpiresAt = new Date(Date.now() + this.refreshTokenTtlSeconds * 1000);

    // Update session with new token hash
    await this.sessionRepository.update(sessionId, {
      refreshTokenHash: newRefreshTokenHash,
      expiresAt: refreshExpiresAt,
      lastUsedAt: new Date(),
      ipAddress: input.ipAddress ?? session.ipAddress,
      userAgent: input.userAgent ?? session.userAgent,
    });

    // Generate new access token
    const accessToken = await signAccessToken({
      sub: session.userId,
      sid: sessionId,
      did: session.deviceId ?? undefined,
    });

    this.logger.log(`Refreshed session ${sessionId}`);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresAt,
      refreshExpiresAt,
    };
  }

  /**
   * Revoke a session (logout)
   */
  async revokeSession(sessionId: string, reason: string = 'logout'): Promise<void> {
    await this.sessionRepository.revoke(sessionId, reason);
    this.logger.log(`Revoked session ${sessionId}: ${reason}`);
  }

  /**
   * Revoke all sessions for a user (logout everywhere)
   */
  async revokeAllUserSessions(userId: string): Promise<number> {
    const count = await this.sessionRepository.revokeAllByUserId(userId);
    this.logger.log(`Revoked ${count} sessions for user ${userId}`);
    return count;
  }

  /**
   * Revoke all sessions for a device
   */
  async revokeDeviceSessions(deviceId: string): Promise<number> {
    const count = await this.sessionRepository.revokeByDeviceId(deviceId);
    this.logger.log(`Revoked ${count} sessions for device ${deviceId}`);
    return count;
  }

  /**
   * Verify and decode an access token
   */
  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      const claims = await jwtVerifyAccessToken(token);
      return {
        sub: claims.sub,
        sid: claims.sid,
        did: claims.did ?? '',
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  /**
   * Validate a session (check if it exists and is not revoked)
   */
  async validateSession(sessionId: string): Promise<boolean> {
    const session = await this.sessionRepository.findById(sessionId);
    
    if (!session || session.revokedAt !== null) {
      return false;
    }

    // Update last used time
    await this.sessionRepository.update(sessionId, {
      lastUsedAt: new Date(),
    });

    return true;
  }

  /**
   * Map platform string to database enums for both platform and device type
   */
  private mapPlatformAndDeviceType(platformInput?: string): {
    platform?: 'windows' | 'macos' | 'web';
    deviceType?: 'desktop' | 'web';
  } {
    if (!platformInput) return {};
    
    const platform = platformInput.toLowerCase();
    
    // Map platform string to database values
    const mapping: Record<string, { 
      platform: 'windows' | 'macos' | 'web';
      deviceType: 'desktop' | 'web';
    }> = {
      'windows': { platform: 'windows', deviceType: 'desktop' },
      'macos': { platform: 'macos', deviceType: 'desktop' },
      'web': { platform: 'web', deviceType: 'web' },
    };
    
    return mapping[platform] ?? { platform: undefined, deviceType: 'desktop' };
  }
}
