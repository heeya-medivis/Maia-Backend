import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  Req,
  Headers,
  BadRequestException,
  UnauthorizedException,
  Logger,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import * as crypto from 'crypto';
import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';
import { WorkOSService } from '../services/workos.service';
import { SessionService } from '../services/session.service';
import { SsoRepository } from '../repositories/sso.repository';
import { DATABASE_CONNECTION, Database } from '../../../database';
import { users, oauthAuthorizationCodes, identities } from '../../../database/schema';
import {
  encodeOAuthState,
  decodeOAuthState,
  getJwks,
  type OAuthState,
} from '../../../utils/jwt';
import type { AuthProtocol } from '../../../database/schema/auth-connections';
import type { IdentityProvider } from '../../../database/schema/identities';

const AUTH_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

@Controller('v1/oauth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);
  private readonly apiUrl: string;
  private readonly webUrl: string;
  private readonly jwtAudience: string;
  private readonly allowedClientIds: string[];
  private readonly webRedirectUris: string[];

  constructor(
    private readonly workosService: WorkOSService,
    private readonly sessionService: SessionService,
    private readonly ssoRepository: SsoRepository,
    private readonly configService: ConfigService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {
    this.apiUrl = this.configService.get<string>('API_URL', 'http://localhost:3000');
    this.webUrl = this.configService.get<string>('WEB_URL', 'http://localhost:3001');
    this.jwtAudience = this.configService.get<string>('JWT_AUDIENCE', 'maia-api');
    this.allowedClientIds = this.configService.get<string[]>('ALLOWED_CLIENT_IDS', ['maia-web', 'maia_desktop']);
    this.webRedirectUris = this.configService.get<string[]>('WEB_REDIRECT_URIS', []);
  }

  /**
   * Validate loopback redirect URIs for native clients
   */
  private isValidLoopbackRedirect(uri: string): boolean {
    const patterns = [
      /^http:\/\/127\.0\.0\.1:\d+\/callback$/,
      /^http:\/\/localhost:\d+\/callback$/,
      /^http:\/\/\[::1\]:\d+\/callback$/,
    ];
    return patterns.some((pattern) => pattern.test(uri));
  }

  /**
   * Validate custom scheme redirect URIs for Unity/XR clients
   */
  private isValidCustomSchemeRedirect(uri: string): boolean {
    const patterns = [
      /^maia:\/\/callback$/,
      /^maia:\/\/auth\/callback$/,
      /^maia:\/\/oauth\/callback$/,
    ];
    return patterns.some((pattern) => pattern.test(uri));
  }

  /**
   * Validate web redirect URIs from environment config
   */
  private isValidWebRedirect(uri: string): boolean {
    return this.webRedirectUris.includes(uri);
  }

  /**
   * Validate any allowed redirect URI
   */
  private isValidRedirectUri(uri: string): boolean {
    return this.isValidLoopbackRedirect(uri) || 
           this.isValidCustomSchemeRedirect(uri) || 
           this.isValidWebRedirect(uri);
  }

  /**
   * Validate OAuth client_id
   */
  private isValidClientId(clientId: string | undefined): boolean {
    if (!clientId) return false;
    return this.allowedClientIds.includes(clientId) || clientId === this.jwtAudience;
  }

  /**
   * Map connection type to identity provider enum
   */
  private mapConnectionTypeToProvider(connectionType: string, provider?: string): IdentityProvider {
    if (provider === 'google' || connectionType === 'GoogleOAuth') {
      return 'workos_oidc_google';
    }
    if (provider === 'microsoft' || connectionType === 'MicrosoftOAuth') {
      return 'workos_oidc_microsoft';
    }
    if (provider === 'apple' || connectionType === 'AppleOAuth') {
      return 'workos_oidc_apple';
    }
    return 'workos_sso';
  }

  /**
   * Map provider to auth protocol
   */
  private mapProviderToAuthProtocol(provider?: string, connectionId?: string): AuthProtocol {
    if (connectionId) return 'workos_sso';
    switch (provider) {
      case 'google': return 'workos_oidc_google';
      case 'microsoft': return 'workos_oidc_microsoft';
      case 'apple': return 'workos_oidc_apple';
      default: return 'workos_oidc_google';
    }
  }

  /**
   * GET /v1/oauth/authorize
   * OAuth 2.0 Authorization endpoint with PKCE support
   * 
   * Supports enterprise SSO:
   * - If login_hint contains an email with an enterprise domain, redirects to that SSO
   * - If connection_id is provided, uses that specific WorkOS connection
   * - Otherwise uses the specified provider or defaults to Google
   */
  @Get('authorize')
  async authorize(
    @Query('response_type') responseType: string,
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('state') state: string,
    @Query('code_challenge') codeChallenge: string,
    @Query('code_challenge_method') codeChallengeMethod: string,
    @Query('provider') provider?: string,
    @Query('connection_id') connectionId?: string,
    @Query('login_hint') loginHint?: string,
    @Headers('x-device-id') deviceId?: string,
    @Headers('x-platform') devicePlatform?: string,
    @Res() res?: Response,
  ): Promise<void> {
    // Validate required OAuth params
    if (responseType !== 'code') {
      throw new BadRequestException('Invalid response_type: must be "code"');
    }

    if (!this.isValidClientId(clientId)) {
      throw new BadRequestException(`Invalid client_id. Allowed: ${this.allowedClientIds.join(', ')}`);
    }

    if (!redirectUri || !this.isValidRedirectUri(redirectUri)) {
      throw new BadRequestException('Invalid redirect_uri');
    }

    if (!codeChallenge || codeChallengeMethod !== 'S256' || !state) {
      throw new BadRequestException('Missing PKCE parameters (code_challenge, code_challenge_method=S256, state)');
    }

    // Check for enterprise SSO via login_hint (email)
    // This allows detecting enterprise users before they authenticate
    let workosConnectionId: string | undefined;
    let enterpriseOrgName: string | undefined;

    if (loginHint && loginHint.includes('@') && !connectionId && !provider) {
      const enterpriseLookup = await this.ssoRepository.lookupEnterpriseByEmail(loginHint);
      if (enterpriseLookup.isEnterprise && enterpriseLookup.connection?.workosConnectionId) {
        workosConnectionId = enterpriseLookup.connection.workosConnectionId;
        enterpriseOrgName = enterpriseLookup.domain?.organizationName ?? enterpriseLookup.connection.name;
        this.logger.log(`Enterprise SSO detected for ${loginHint} -> ${enterpriseOrgName}`);
      }
    }

    // Use provided connection_id if specified
    if (connectionId) {
      const connection = await this.ssoRepository.findConnectionById(connectionId);
      if (connection?.workosConnectionId) {
        workosConnectionId = connection.workosConnectionId;
      }
    }

    // No provider specified and not enterprise - show provider selection or default to Google
    if (!provider && !workosConnectionId) {
      const providers = this.workosService.getAvailableProviders();
      if (providers.length === 0) {
        throw new BadRequestException('No authentication providers configured');
      }
      // Default to first available provider
      provider = providers[0];
    }

    // Determine auth protocol
    const authProtocol = workosConnectionId 
      ? 'workos_sso' as AuthProtocol
      : this.mapProviderToAuthProtocol(provider, connectionId);

    // Encode OAuth state with HMAC signature
    // Use the frontend's state as nonce - this will be returned in the callback
    // so the frontend can verify the response matches its original request
    const oauthState = encodeOAuthState({
      redirectUri,
      codeChallenge,
      clientId,
      provider: workosConnectionId ? undefined : provider,
      connectionId: workosConnectionId ?? connectionId,
      deviceId,
      devicePlatform,
      nonce: state, // Use frontend's state as nonce to preserve CSRF protection
    });

    // Build WorkOS authorization URL
    const workosAuthUrl = this.workosService.getAuthorizationUrl({
      connectionId: workosConnectionId,
      provider: workosConnectionId ? undefined : this.workosService.getWorkOSProvider(provider ?? 'google'),
      loginHint,
      state: oauthState,
      codeChallenge,
      codeChallengeMethod: 'S256',
    });

    this.logger.log(`Redirecting to WorkOS for ${workosConnectionId ? 'enterprise SSO' : (provider ?? 'SSO')} auth`);
    res!.redirect(workosAuthUrl);
  }

  /**
   * GET /v1/oauth/callback
   * WorkOS callback - exchanges WorkOS code for user profile
   */
  @Get('callback')
  async callback(
    @Query('code') workosCode: string,
    @Query('state') encodedState: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!workosCode || !encodedState) {
      throw new BadRequestException('Missing code or state parameter');
    }

    // Decode and verify state
    const state = decodeOAuthState(encodedState);
    if (!state) {
      throw new BadRequestException('Invalid or tampered state parameter');
    }

    try {
      // Exchange WorkOS code for profile
      const { profile } = await this.workosService.getProfileAndToken(workosCode);

      this.logger.log(`WorkOS callback for email: ${profile.email}`);

      // Find or create user
      let user = await this.findUserByEmail(profile.email);
      
      if (!user) {
        // Create new user
        user = await this.createUser({
          email: profile.email,
          firstName: profile.firstName ?? '',
          lastName: profile.lastName ?? '',
        });
        this.logger.log(`Created new user: ${user.id}`);
      } else {
        // Update user's name if it was missing and now available from profile
        const needsUpdate = 
          (!user.firstName && profile.firstName) || 
          (!user.lastName && profile.lastName);
        
        if (needsUpdate) {
          await this.db
            .update(users)
            .set({
              firstName: user.firstName || profile.firstName || '',
              lastName: user.lastName || profile.lastName || '',
              updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));
          
          // Update local user object
          user = { ...user, firstName: user.firstName || profile.firstName || '', lastName: user.lastName || profile.lastName || '' };
          this.logger.log(`Updated user name: ${user.id}`);
        }
      }

      // Upsert identity
      const identityProvider = this.mapConnectionTypeToProvider(profile.connectionType, state.provider);
      await this.upsertIdentity({
        userId: user.id,
        provider: identityProvider,
        providerSubject: profile.id,
        email: profile.email,
        rawAttributes: profile.rawAttributes,
      });

      // Generate our authorization code
      const authCode = nanoid(32);
      const authProtocol = this.mapProviderToAuthProtocol(state.provider, state.connectionId);

      await this.db.insert(oauthAuthorizationCodes).values({
        id: authCode,
        userId: user.id,
        clientId: state.clientId,
        redirectUri: state.redirectUri,
        codeChallenge: state.codeChallenge,
        codeChallengeMethod: 'S256',
        authMethod: authProtocol,
        deviceId: state.deviceId,
        devicePlatform: state.devicePlatform,
        expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
      });

      // Redirect back to client with our auth code
      const redirectUrl = new URL(state.redirectUri);
      redirectUrl.searchParams.set('code', authCode);
      redirectUrl.searchParams.set('state', state.nonce);

      this.logger.log(`Redirecting to client: ${redirectUrl.origin}`);
      res.redirect(redirectUrl.toString());
    } catch (error) {
      this.logger.error(`WorkOS callback error: ${error.message}`);
      
      // Redirect to client with error
      const redirectUrl = new URL(state.redirectUri);
      redirectUrl.searchParams.set('error', 'access_denied');
      redirectUrl.searchParams.set('error_description', 'Authentication failed');
      res.redirect(redirectUrl.toString());
    }
  }

  /**
   * POST /v1/oauth/token
   * Token endpoint - exchanges auth code for access/refresh tokens
   */
  @Post('token')
  async token(
    @Body('grant_type') grantType: string,
    @Body('code') code: string,
    @Body('redirect_uri') redirectUri: string,
    @Body('code_verifier') codeVerifier: string,
    @Body('refresh_token') refreshToken: string,
    @Req() req: Request,
  ) {
    if (grantType === 'authorization_code') {
      return this.exchangeAuthCode(code, redirectUri, codeVerifier, req);
    } else if (grantType === 'refresh_token') {
      return this.refreshTokens(refreshToken, req);
    } else {
      throw new BadRequestException('Invalid grant_type. Must be authorization_code or refresh_token');
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeAuthCode(
    code: string,
    redirectUri: string,
    codeVerifier: string,
    req: Request,
  ) {
    if (!code || !redirectUri || !codeVerifier) {
      throw new BadRequestException('Missing required parameters');
    }

    // Find authorization code
    const [authCode] = await this.db
      .select()
      .from(oauthAuthorizationCodes)
      .where(eq(oauthAuthorizationCodes.id, code))
      .limit(1);

    if (!authCode) {
      throw new UnauthorizedException('Invalid authorization code');
    }

    if (authCode.usedAt) {
      throw new UnauthorizedException('Authorization code already used');
    }

    if (authCode.expiresAt < new Date()) {
      throw new UnauthorizedException('Authorization code expired');
    }

    if (authCode.redirectUri !== redirectUri) {
      throw new UnauthorizedException('Redirect URI mismatch');
    }

    // Verify PKCE code_verifier
    const expectedChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    if (expectedChallenge !== authCode.codeChallenge) {
      throw new UnauthorizedException('Invalid code_verifier');
    }

    // Mark code as used
    await this.db
      .update(oauthAuthorizationCodes)
      .set({ usedAt: new Date() })
      .where(eq(oauthAuthorizationCodes.id, code));

    // Create session
    const tokens = await this.sessionService.createSession({
      userId: authCode.userId!,
      deviceId: authCode.deviceId ?? undefined,
      authMethod: authCode.authMethod!,
      ipAddress: req.headers['x-forwarded-for'] as string ?? req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Get user info
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, authCode.userId!))
      .limit(1);

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: 'Bearer',
      expires_in: Math.floor((tokens.expiresAt.getTime() - Date.now()) / 1000),
      user_id: user?.id,
    };
  }

  /**
   * Refresh access token
   */
  private async refreshTokens(refreshToken: string, req: Request) {
    if (!refreshToken) {
      throw new BadRequestException('Missing refresh_token');
    }

    const tokens = await this.sessionService.refreshSession({
      refreshToken,
      ipAddress: req.headers['x-forwarded-for'] as string ?? req.ip,
      userAgent: req.headers['user-agent'],
    });

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: 'Bearer',
      expires_in: Math.floor((tokens.expiresAt.getTime() - Date.now()) / 1000),
    };
  }

  /**
   * GET /v1/oauth/.well-known/jwks.json
   * JWKS endpoint for public key distribution
   */
  @Get('.well-known/jwks.json')
  async jwks() {
    return getJwks();
  }

  // Helper methods

  private async findUserByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user ?? null;
  }

  private async createUser(data: { email: string; firstName: string; lastName: string }) {
    const [user] = await this.db
      .insert(users)
      .values({
        id: nanoid(),
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        emailConfirmed: true,
      })
      .returning();
    return user;
  }

  private async upsertIdentity(data: {
    userId: string;
    provider: IdentityProvider;
    providerSubject: string;
    email?: string;
    rawAttributes: Record<string, unknown>;
  }) {
    // Check if identity exists
    const [existing] = await this.db
      .select()
      .from(identities)
      .where(
        and(
          eq(identities.provider, data.provider),
          eq(identities.providerSubject, data.providerSubject),
        ),
      )
      .limit(1);

    if (existing) {
      // Update existing identity
      await this.db
        .update(identities)
        .set({
          email: data.email,
          rawAttributes: data.rawAttributes,
          updatedAt: new Date(),
        })
        .where(eq(identities.id, existing.id));
    } else {
      // Create new identity
      await this.db.insert(identities).values({
        id: nanoid(),
        userId: data.userId,
        provider: data.provider,
        providerSubject: data.providerSubject,
        email: data.email,
        rawAttributes: data.rawAttributes,
      });
    }
  }
}
