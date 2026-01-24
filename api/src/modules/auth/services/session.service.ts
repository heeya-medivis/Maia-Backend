import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { nanoid } from 'nanoid';
import * as jose from 'jose';
import * as crypto from 'crypto';
import { SessionRepository } from '../repositories/session.repository';
import { DeviceInfoDto } from '../dto/auth.dto';

// Configuration
const ACCESS_TOKEN_EXPIRY_MINUTES = 15;
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const REFRESH_TOKEN_LENGTH = 64;

export interface CreateSessionInput {
  userId: string;
  deviceId: string;
  clerkSessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: DeviceInfoDto;
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
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly jwtSecret: Uint8Array;

  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly configService: ConfigService,
  ) {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    this.jwtSecret = new TextEncoder().encode(secret);
  }

  /**
   * Hash a refresh token using SHA-256
   */
  private hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Create a new session and return access/refresh tokens
   */
  async createSession(input: CreateSessionInput): Promise<SessionTokens> {
    // Check for existing active session for this user/device
    const existingSession = await this.sessionRepository.findActiveByUserAndDevice(
      input.userId,
      input.deviceId,
    );

    if (existingSession) {
      // Revoke the existing session
      await this.sessionRepository.revoke(existingSession.id);
      this.logger.log(`Revoked existing session ${existingSession.id} for device ${input.deviceId}`);
    }

    const sessionId = nanoid();
    const refreshToken = nanoid(REFRESH_TOKEN_LENGTH);
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRY_MINUTES * 60 * 1000);
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    // Create session in database (store hash, not plaintext)
    await this.sessionRepository.create({
      id: sessionId,
      userId: input.userId,
      deviceId: input.deviceId,
      refreshToken: refreshTokenHash, // Legacy field - now stores hash
      refreshTokenHash, // New hashed field
      clerkSessionId: input.clerkSessionId ?? null,
      expiresAt,
      refreshExpiresAt,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });

    // Generate JWT access token
    const accessToken = await this.generateAccessToken({
      sub: input.userId,
      sid: sessionId,
      did: input.deviceId,
    }, expiresAt);

    this.logger.log(`Created session ${sessionId} for user ${input.userId} on device ${input.deviceId}`);

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
    const refreshTokenHash = this.hashRefreshToken(input.refreshToken);
    
    // First, check if this is the current refresh token
    let session = await this.sessionRepository.findByRefreshTokenHash(refreshTokenHash);

    if (!session) {
      // Check if this is a previously used refresh token (reuse attack detection)
      session = await this.sessionRepository.findByPreviousRefreshTokenHash(refreshTokenHash);
      
      if (session) {
        // SECURITY: Reuse detected! Revoke ALL sessions for this device
        this.logger.warn(
          `Refresh token reuse detected for session ${session.id}, device ${session.deviceId}. Revoking all device sessions.`,
        );
        await this.sessionRepository.revokeByDeviceId(session.deviceId);
        throw new UnauthorizedException('Refresh token has been revoked due to suspected token theft');
      }
      
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.isRevoked) {
      throw new UnauthorizedException('Session has been revoked');
    }

    if (session.refreshExpiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Generate new tokens
    const newRefreshToken = nanoid(REFRESH_TOKEN_LENGTH);
    const newRefreshTokenHash = this.hashRefreshToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRY_MINUTES * 60 * 1000);
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    // Update session with new tokens, keeping previous hash for reuse detection
    await this.sessionRepository.update(session.id, {
      refreshToken: newRefreshTokenHash, // Legacy field - now stores hash
      refreshTokenHash: newRefreshTokenHash,
      previousRefreshTokenHash: refreshTokenHash, // Store old hash for reuse detection
      expiresAt,
      refreshExpiresAt,
      lastActiveAt: new Date(),
      ipAddress: input.ipAddress ?? session.ipAddress,
      userAgent: input.userAgent ?? session.userAgent,
    });

    // Generate new access token
    const accessToken = await this.generateAccessToken({
      sub: session.userId,
      sid: session.id,
      did: session.deviceId,
    }, expiresAt);

    this.logger.log(`Refreshed session ${session.id}`);

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
  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionRepository.revoke(sessionId);
    this.logger.log(`Revoked session ${sessionId}`);
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
      const { payload } = await jose.jwtVerify(token, this.jwtSecret, {
        algorithms: ['HS256'],
      });

      return {
        sub: payload.sub as string,
        sid: payload.sid as string,
        did: payload.did as string,
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
    
    if (!session || session.isRevoked) {
      return false;
    }

    // Update last active time
    await this.sessionRepository.update(sessionId, {
      lastActiveAt: new Date(),
    });

    return true;
  }

  private async generateAccessToken(payload: AccessTokenPayload, expiresAt: Date): Promise<string> {
    return await new jose.SignJWT({
      sub: payload.sub,
      sid: payload.sid,
      did: payload.did,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresAt)
      .sign(this.jwtSecret);
  }
}
