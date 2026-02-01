import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Logger,
} from "@nestjs/common";
import { Request } from "express";
import { SessionService } from "../services/session.service";
import { DevicesRepository } from "../repositories/devices.repository";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { CurrentUser } from "../decorators/current-user.decorator";
import {
  CurrentSession,
  SessionInfo,
} from "../decorators/current-session.decorator";
import { User } from "../../../database/schema";
import {
  RefreshTokenDto,
  TokenResponseDto,
  MeResponseDto,
} from "../dto/auth.dto";

/**
 * Auth Controller
 *
 * Handles session management for authenticated users.
 * The main OAuth 2.0 + PKCE flow is handled by OAuthController.
 *
 * Endpoints:
 * - GET /v1/auth/me - Get current user info
 * - POST /v1/auth/refresh - Refresh expired tokens
 * - POST /v1/auth/logout - Invalidate current session
 * - POST /v1/auth/logout-all - Invalidate all user sessions
 */
@Controller("v1/auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly sessionService: SessionService,
    private readonly devicesRepository: DevicesRepository,
  ) {}

  /**
   * POST /auth/refresh
   * Refresh expired tokens
   */
  @Post("refresh")
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<TokenResponseDto> {
    const tokens = await this.sessionService.refreshSession({
      refreshToken: dto.refreshToken,
      ipAddress:
        (req.headers["x-forwarded-for"] as string) ??
        (req.headers["cf-connecting-ip"] as string),
      userAgent: req.headers["user-agent"] as string,
    });

    return {
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt.toISOString(),
      refreshExpiresAt: tokens.refreshExpiresAt.toISOString(),
    };
  }

  /**
   * GET /v1/auth/me
   * Get current user info
   */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(
    @CurrentUser() user: User,
    @CurrentSession() session: SessionInfo,
  ): Promise<MeResponseDto> {
    const userDevices = await this.devicesRepository.findActiveByUserId(
      user.id,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organization: user.organization,
        role: user.role,
        isAdmin: user.isAdmin ?? false,
      },
      devices: userDevices.map((d) => ({
        id: d.id,
        name: d.name,
        deviceType: d.deviceType,
        platform: d.platform,
        lastActiveAt: d.lastActiveAt,
        isActive: d.isActive,
      })),
      currentDeviceId: session.deviceId,
    };
  }

  /**
   * POST /auth/logout
   * Invalidate current session
   */
  @Post("logout")
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: User,
    @CurrentSession() session: SessionInfo,
  ) {
    this.logger.log(
      `[auth/logout] Revoking session ${session.sessionId} for user ${user.id}`,
    );
    await this.sessionService.revokeSession(session.sessionId);

    return {
      success: true,
      message: "Logged out successfully",
    };
  }

  /**
   * POST /auth/logout-all
   * Invalidate all sessions for user
   */
  @Post("logout-all")
  @UseGuards(JwtAuthGuard)
  async logoutAll(@CurrentUser() user: User) {
    this.logger.log(
      `[auth/logout-all] Revoking all sessions for user ${user.id}`,
    );
    const count = await this.sessionService.revokeAllUserSessions(user.id);
    this.logger.log(`[auth/logout-all] Revoked ${count} sessions`);

    return {
      success: true,
      message: `Logged out from ${count} sessions`,
      sessionsRevoked: count,
    };
  }
}
