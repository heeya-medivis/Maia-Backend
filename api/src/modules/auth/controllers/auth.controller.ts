import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
  Res,
  Req,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import { verifyToken, createClerkClient } from '@clerk/backend';
import { HandoffService } from '../services/handoff.service';
import { SessionService } from '../services/session.service';
import { DevicesRepository } from '../repositories/devices.repository';
import { UsersRepository } from '../../users/users.repository';
import { ClerkAuthGuard } from '../guards/clerk-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import {
  InitiateHandoffDto,
  CallbackDto,
  DeviceTokenDto,
  RefreshTokenDto,
  HandoffInitiateResponseDto,
  HandoffPollResponseDto,
  CallbackResponseDto,
  TokenResponseDto,
  MeResponseDto,
} from '../dto/auth.dto';

const DEVICE_ID_HEADER = 'X-Device-ID';

interface AuthUser {
  id: string;
  sessionId: string;
  deviceId: string;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly apiUrl: string;
  private readonly webUrl: string;
  private readonly clerkSecretKey: string;
  private readonly clerkClient: ReturnType<typeof createClerkClient>;

  constructor(
    private readonly handoffService: HandoffService,
    private readonly sessionService: SessionService,
    private readonly devicesRepository: DevicesRepository,
    private readonly usersRepository: UsersRepository,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl = this.configService.get<string>('API_URL', 'http://localhost:3000');
    this.webUrl = this.configService.get<string>('WEB_URL', 'http://localhost:3001');
    this.clerkSecretKey = this.configService.getOrThrow<string>('CLERK_SECRET_KEY');
    this.clerkClient = createClerkClient({ secretKey: this.clerkSecretKey });
  }

  /**
   * POST /auth/handoff/initiate
   * Unity calls this to start auth flow
   */
  @Post('handoff/initiate')
  async initiateHandoff(
    @Body() dto: InitiateHandoffDto,
  ): Promise<HandoffInitiateResponseDto> {
    const { deviceId } = dto;

    // Clean up any existing unused handoff codes for this device
    await this.handoffService.cleanupDeviceHandoffCodes(deviceId);

    // Generate the auth URL - this page will handle Clerk auth
    const authUrl = `${this.apiUrl}/auth/login?device_id=${encodeURIComponent(deviceId)}`;

    return {
      success: true,
      authUrl,
      deviceId,
      message: 'Open authUrl in browser to authenticate',
    };
  }

  /**
   * GET /auth/handoff/poll
   * Unity polls this to check if auth is complete
   */
  @Get('handoff/poll')
  async pollHandoff(
    @Query('device_id') deviceId: string,
  ): Promise<HandoffPollResponseDto> {
    if (!deviceId) {
      throw new BadRequestException('Missing device_id parameter');
    }

    // Look for a ready (unused, unexpired) handoff code for this device
    const handoffCode = await this.handoffService.findUnusedByDeviceId(deviceId);

    if (!handoffCode) {
      return {
        status: 'pending',
        message: 'Waiting for user to authenticate in browser',
      };
    }

    // Check if expired
    if (handoffCode.expiresAt < new Date()) {
      return {
        status: 'expired',
        message: 'Authentication session expired. Please try again.',
      };
    }

    // Code is ready!
    return {
      status: 'ready',
      code: handoffCode.code,
      expiresAt: handoffCode.expiresAt.toISOString(),
    };
  }

  /**
   * GET /auth/login
   * Redirect to Next.js frontend sign-in page
   */
  @Get('login')
  async login(
    @Query('device_id') deviceId: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!deviceId) {
      res.status(400).json({ error: 'Missing device_id parameter' });
      return;
    }

    // Redirect to our Next.js frontend sign-in page
    // Always use fresh=true to sign out any existing Clerk session first
    const signInUrl = `${this.webUrl}/sign-in?device_id=${encodeURIComponent(deviceId)}&fresh=true`;
    res.redirect(signInUrl);
  }

  /**
   * GET /auth/complete
   * Redirect to Next.js frontend (kept for backwards compatibility)
   */
  @Get('complete')
  async complete(
    @Query('device_id') deviceId: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!deviceId) {
      res.redirect(`${this.webUrl}/auth/complete?error=missing_device_id`);
      return;
    }

    res.redirect(`${this.webUrl}/auth/complete?device_id=${encodeURIComponent(deviceId)}`);
  }

  /**
   * POST /auth/callback
   * Generate handoff code after Clerk auth in browser
   */
  @Post('callback')
  async callback(
    @Body() dto: CallbackDto,
  ): Promise<CallbackResponseDto> {
    const { deviceId, clerkSessionToken } = dto;

    this.logger.log(`[auth/callback] Starting for deviceId: ${deviceId}`);

    // Verify Clerk session token (JWT)
    let clerkSession: { id?: string; userId: string };
    try {
      const verifiedToken = await verifyToken(clerkSessionToken, {
        secretKey: this.clerkSecretKey,
      });
      clerkSession = { id: verifiedToken.sid, userId: verifiedToken.sub! };
      this.logger.log(`[auth/callback] Clerk session verified - userId: ${clerkSession.userId}`);
    } catch {
      throw new UnauthorizedException('Invalid Clerk session');
    }

    if (!clerkSession?.userId) {
      throw new UnauthorizedException('Invalid Clerk session');
    }

    // Ensure user exists in our database (handle race conditions with webhook)
    let existingUser = await this.usersRepository.findById(clerkSession.userId);

    this.logger.log(`[auth/callback] Existing user by Clerk ID: ${existingUser ? existingUser.id : 'NOT FOUND'}`);

    if (!existingUser) {
      // User should be created via webhook, but handle edge case by fetching from Clerk
      const clerkUser = await this.clerkClient.users.getUser(clerkSession.userId);
      const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';
      this.logger.log(`[auth/callback] Fetched Clerk user - email: ${email}`);

      // Check if user exists by email (including soft-deleted users)
      const existingByEmail = await this.usersRepository.findByEmail(email);

      this.logger.log(`[auth/callback] Existing user by email: ${existingByEmail ? existingByEmail.id : 'NOT FOUND'}, deletedAt: ${existingByEmail?.deletedAt ?? 'null'}`);

      if (existingByEmail) {
        // User already exists with this email - update profile and reactivate if soft-deleted
        this.logger.log(`[auth/callback] Updating existing user ${existingByEmail.id} with Clerk profile${existingByEmail.deletedAt ? ' (reactivating soft-deleted user)' : ''}`);
        existingUser = await this.usersRepository.update(existingByEmail.id, {
          firstName: clerkUser.firstName ?? '',
          lastName: clerkUser.lastName ?? '',
          imageUrl: clerkUser.imageUrl,
          emailConfirmed: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
          deletedAt: null, // Reactivate if soft-deleted
        });
        // Use the existing user's ID for the rest of the flow
        clerkSession.userId = existingByEmail.id;
      } else {
        // Create new user
        this.logger.log(`[auth/callback] Creating new user with Clerk ID: ${clerkUser.id}`);
        existingUser = await this.usersRepository.create({
          id: clerkUser.id,
          email,
          firstName: clerkUser.firstName ?? '',
          lastName: clerkUser.lastName ?? '',
          imageUrl: clerkUser.imageUrl,
          emailConfirmed: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
        });
      }
    }

    this.logger.log(`[auth/callback] Final userId for handoff: ${clerkSession.userId}`);

    // Clean up any existing unused handoff codes for this device
    await this.handoffService.cleanupDeviceHandoffCodes(deviceId);

    // Create new handoff code
    const result = await this.handoffService.createHandoffCode({
      userId: clerkSession.userId,
      deviceId,
      clerkSessionId: clerkSession.id,
    });

    return {
      success: true,
      code: result.code,
      deepLink: result.deepLink,
      expiresAt: result.expiresAt.toISOString(),
    };
  }

  /**
   * POST /auth/device-token
   * Exchange handoff code for session tokens
   */
  @Post('device-token')
  async deviceToken(
    @Headers(DEVICE_ID_HEADER) deviceId: string,
    @Body() dto: DeviceTokenDto,
    @Req() req: Request,
  ): Promise<TokenResponseDto> {
    if (!deviceId) {
      throw new BadRequestException(`Missing ${DEVICE_ID_HEADER} header`);
    }

    const { code, deviceInfo } = dto;

    // Validate and consume handoff code
    let validatedCode;
    try {
      validatedCode = await this.handoffService.validateAndConsumeHandoffCode({
        code,
        deviceId,
      });
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }

    // Create or update device
    await this.devicesRepository.upsert({
      id: deviceId,
      userId: validatedCode.userId,
      name: deviceInfo?.name,
      deviceType: deviceInfo?.deviceType as any,
      platform: deviceInfo?.platform as any,
      appVersion: deviceInfo?.appVersion,
      osVersion: deviceInfo?.osVersion,
    });

    // Create session
    const tokens = await this.sessionService.createSession({
      userId: validatedCode.userId,
      deviceId,
      clerkSessionId: validatedCode.clerkSessionId ?? undefined,
      ipAddress: req.headers['x-forwarded-for'] as string ?? req.headers['cf-connecting-ip'] as string,
      userAgent: req.headers['user-agent'] as string,
      deviceInfo,
    });

    // Get user info
    const user = await this.usersRepository.findById(validatedCode.userId);

    return {
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt.toISOString(),
      refreshExpiresAt: tokens.refreshExpiresAt.toISOString(),
      user: user
        ? {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl,
          }
        : undefined,
    };
  }

  /**
   * POST /auth/refresh
   * Refresh expired tokens
   */
  @Post('refresh')
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<TokenResponseDto> {
    const tokens = await this.sessionService.refreshSession({
      refreshToken: dto.refreshToken,
      ipAddress: req.headers['x-forwarded-for'] as string ?? req.headers['cf-connecting-ip'] as string,
      userAgent: req.headers['user-agent'] as string,
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
   * GET /auth/me
   * Get current user info
   */
  @Get('me')
  @UseGuards(ClerkAuthGuard)
  async me(@CurrentUser() authUser: AuthUser): Promise<MeResponseDto> {
    // Get full user info
    const user = await this.usersRepository.findById(authUser.id);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Get user's devices
    const userDevices = await this.devicesRepository.findActiveByUserId(authUser.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        emailVerified: user.emailConfirmed ?? false,
      },
      devices: userDevices.map((d) => ({
        id: d.id,
        name: d.name,
        deviceType: d.deviceType,
        platform: d.platform,
        lastActiveAt: d.lastActiveAt,
        isActive: d.isActive,
      })),
      currentDeviceId: authUser.deviceId,
    };
  }

  /**
   * POST /auth/logout
   * Invalidate current session
   */
  @Post('logout')
  @UseGuards(ClerkAuthGuard)
  async logout(@CurrentUser() authUser: AuthUser) {
    await this.sessionService.revokeSession(authUser.sessionId);

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  /**
   * POST /auth/logout-all
   * Invalidate all sessions for user
   */
  @Post('logout-all')
  @UseGuards(ClerkAuthGuard)
  async logoutAll(@CurrentUser() authUser: AuthUser) {
    const count = await this.sessionService.revokeAllUserSessions(authUser.id);

    return {
      success: true,
      message: `Logged out from ${count} sessions`,
      sessionsRevoked: count,
    };
  }
}
