import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Logger,
  Inject,
  Req,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { WorkOSService } from "../services/workos.service";
import { SessionService } from "../services/session.service";
import { UsersService } from "../../users/users.service";
import { DATABASE_CONNECTION, Database } from "../../../database";
import { users, oauthAuthorizationCodes } from "../../../database/schema";

const AUTH_CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface MagicAuthRequestDto {
  email: string;
  clientId?: string;
}

interface MagicAuthVerifyDto {
  email: string;
  code: string;
  clientId?: string;
  codeChallenge?: string;
  codeChallengeMethod?: "S256";
  deviceId?: string;
  devicePlatform?: string;
  redirectUri?: string;
}

/**
 * Magic Auth Controller
 *
 * Handles passwordless authentication via 6-digit email codes.
 * Flow:
 * 1. POST /v1/auth/magic-auth - Request code to be sent to email
 * 2. POST /v1/auth/magic-auth/verify - Verify code and get tokens/auth code
 *
 * @see https://workos.com/docs/reference/authkit/magic-auth
 */
@Controller("v1/auth/magic-auth")
export class MagicAuthController {
  private readonly logger = new Logger(MagicAuthController.name);
  private readonly allowedClientIds: string[];

  constructor(
    private readonly workosService: WorkOSService,
    private readonly sessionService: SessionService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {
    this.allowedClientIds = this.configService.get<string[]>(
      "ALLOWED_CLIENT_IDS",
      ["maia-web", "maia_desktop"],
    );
  }

  /**
   * POST /v1/auth/magic-auth
   * Request a 6-digit code to be sent to the user's email
   */
  @Post()
  async requestMagicAuth(
    @Body() body: MagicAuthRequestDto,
  ): Promise<{ success: boolean; message: string }> {
    const { email, clientId } = body;

    if (!email || !email.includes("@")) {
      throw new BadRequestException("Valid email address is required");
    }

    // Validate client_id if provided
    if (clientId && !this.allowedClientIds.includes(clientId)) {
      throw new BadRequestException("Invalid client_id");
    }

    try {
      // Create and send magic auth code via WorkOS
      // This automatically sends the 6-digit code email
      await this.workosService.createMagicAuth(email);

      this.logger.log(`Magic auth code sent to: ${email}`);

      return {
        success: true,
        message: "Verification code sent to your email",
      };
    } catch (error) {
      this.logger.error(
        `Failed to send magic auth code: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        "Failed to send verification code. Please try again.",
      );
    }
  }

  /**
   * POST /v1/auth/magic-auth/verify
   * Verify the 6-digit code and return tokens
   */
  @Post("verify")
  async verifyMagicAuth(
    @Body() body: MagicAuthVerifyDto,
    @Req() req: Request,
  ): Promise<
    | {
        accessToken: string;
        refreshToken: string;
        expiresAt: string;
      }
    | {
        code: string;
      }
  > {
    const {
      email,
      code,
      clientId,
      codeChallenge,
      codeChallengeMethod,
      deviceId,
      devicePlatform,
      redirectUri,
    } = body;

    if (!email || !code) {
      throw new BadRequestException("Email and code are required");
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      throw new BadRequestException(
        "Invalid code format. Please enter the 6-digit code.",
      );
    }

    // For Unity clients, require PKCE parameters
    const isUnityClient = clientId === "maia_desktop";
    if (isUnityClient && (!codeChallenge || codeChallengeMethod !== "S256")) {
      throw new BadRequestException(
        "PKCE code_challenge required for desktop clients",
      );
    }

    try {
      // Verify the code with WorkOS
      const ipAddress = (req.headers["x-forwarded-for"] as string) ?? req.ip;
      const userAgent = req.headers["user-agent"];

      const result = await this.workosService.authenticateWithMagicAuth(
        email,
        code,
        ipAddress,
        userAgent,
      );

      const workosUser = result.user;
      this.logger.log(`Magic auth verified for: ${workosUser.email}`);

      // Find or create user in our database
      let user = await this.findUserByEmail(workosUser.email);

      if (!user) {
        user = await this.createUser({
          email: workosUser.email,
          firstName: workosUser.firstName || "",
          lastName: workosUser.lastName || "",
        });
        this.logger.log(`Created new user from magic auth: ${user.id}`);
      }

      // Update last login timestamp
      const isWebLogin = devicePlatform === "web" || !devicePlatform;
      await this.db
        .update(users)
        .set({
          ...(isWebLogin
            ? { lastLoginWeb: new Date() }
            : { lastLoginApp: new Date() }),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      if (isUnityClient) {
        // Generate authorization code for Unity to exchange via PKCE
        const authCode = nanoid(32);

        await this.db.insert(oauthAuthorizationCodes).values({
          id: authCode,
          userId: user.id,
          clientId: clientId || "maia_desktop",
          redirectUri: redirectUri || "",
          codeChallenge: codeChallenge!,
          codeChallengeMethod: "S256",
          deviceId: deviceId ?? null,
          devicePlatform: devicePlatform ?? null,
          authMethod: "workos_magic_link",
          expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
        });

        this.logger.log(
          `Generated auth code for Unity client, user: ${user.id}`,
        );

        return { code: authCode };
      } else {
        // Web client - create session and return tokens directly
        const tokens = await this.sessionService.createSession({
          userId: user.id,
          deviceId,
          devicePlatform,
          authMethod: "workos_magic_link",
          ipAddress,
          userAgent,
        });

        this.logger.log(`Created session for web client, user: ${user.id}`);

        return {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt.toISOString(),
        };
      }
    } catch (error) {
      this.logger.error(
        `Magic auth verification failed: ${error.message}`,
        error.stack,
      );

      const errorMsg = error.message?.toLowerCase() ?? "";
      if (errorMsg.includes("invalid") || errorMsg.includes("expired")) {
        throw new BadRequestException(
          "Invalid or expired code. Please try again.",
        );
      }

      throw new BadRequestException("Verification failed. Please try again.");
    }
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

  private async createUser(data: {
    email: string;
    firstName: string;
    lastName: string;
  }) {
    return this.usersService.create({
      id: nanoid(),
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
    });
  }
}
