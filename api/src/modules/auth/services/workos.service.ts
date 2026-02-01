import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WorkOS } from "@workos-inc/node";

import type {
  Connection,
  AutoPaginatable,
  SerializedListConnectionsOptions,
  MagicAuth,
  AuthenticationResponse,
} from "@workos-inc/node";

export interface WorkOSSsoOptions {
  connectionId?: string;
  organizationId?: string;
  provider?: "GoogleOAuth" | "MicrosoftOAuth" | "AppleOAuth";
  loginHint?: string;
  state: string;
  redirectUri?: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
}

export interface WorkOSProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  rawAttributes: Record<string, unknown>;
  connectionId: string;
  connectionType: string;
  organizationId: string | null;
}

@Injectable()
export class WorkOSService {
  private readonly workos: WorkOS;
  private readonly clientId: string;
  private readonly redirectUri: string;
  private readonly googleConnectionId?: string;
  private readonly microsoftConnectionId?: string;
  private readonly appleConnectionId?: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>("WORKOS_API_KEY");
    this.workos = new WorkOS(apiKey);
    this.clientId = this.configService.getOrThrow<string>("WORKOS_CLIENT_ID");
    this.redirectUri = this.configService.getOrThrow<string>(
      "WORKOS_REDIRECT_URI",
    );
    this.googleConnectionId = this.configService.get<string>(
      "WORKOS_GOOGLE_CONNECTION_ID",
    );
    this.microsoftConnectionId = this.configService.get<string>(
      "WORKOS_MICROSOFT_CONNECTION_ID",
    );
    this.appleConnectionId = this.configService.get<string>(
      "WORKOS_APPLE_CONNECTION_ID",
    );
  }

  /**
   * Get SSO authorization URL for enterprise connections or social login
   */
  getAuthorizationUrl(options: WorkOSSsoOptions): string {
    const {
      connectionId,
      organizationId,
      provider,
      loginHint,
      state,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
    } = options;

    const baseOptions = {
      clientId: this.clientId,
      redirectUri: redirectUri ?? this.redirectUri,
      state,
      codeChallenge,
      codeChallengeMethod,
      ...(loginHint !== undefined && loginHint !== "" && { loginHint }),
    };

    // WorkOS SDK requires exactly one of: connection, organization, or provider
    // Priority: connectionId > provider > organizationId
    if (connectionId !== undefined && connectionId !== "") {
      return this.workos.sso.getAuthorizationUrl({
        ...baseOptions,
        connection: connectionId,
      });
    }

    if (provider !== undefined) {
      return this.workos.sso.getAuthorizationUrl({
        ...baseOptions,
        provider,
      });
    }

    if (organizationId !== undefined && organizationId !== "") {
      return this.workos.sso.getAuthorizationUrl({
        ...baseOptions,
        organization: organizationId,
      });
    }

    // Default to GoogleOAuth if no specific connection specified
    return this.workos.sso.getAuthorizationUrl({
      ...baseOptions,
      provider: "GoogleOAuth",
    });
  }

  /**
   * Exchange authorization code for user profile
   */
  async getProfileAndToken(
    code: string,
  ): Promise<{ profile: WorkOSProfile; accessToken: string }> {
    const { profile, accessToken } = await this.workos.sso.getProfileAndToken({
      code,
      clientId: this.clientId,
    });

    return {
      profile: {
        id: profile.id,
        email: profile.email,
        firstName: profile.firstName ?? null,
        lastName: profile.lastName ?? null,
        rawAttributes: profile.rawAttributes ?? {},
        connectionId: profile.connectionId,
        connectionType: profile.connectionType,
        organizationId: profile.organizationId ?? null,
      },
      accessToken,
    };
  }

  /**
   * Get connection info by ID
   */
  async getConnection(connectionId: string): Promise<Connection> {
    return this.workos.sso.getConnection(connectionId);
  }

  /**
   * List connections for an organization
   */
  async listConnections(
    organizationId: string,
  ): Promise<AutoPaginatable<Connection, SerializedListConnectionsOptions>> {
    return this.workos.sso.listConnections({
      organizationId,
    });
  }

  /**
   * Get WorkOS connection ID for a social provider
   * Returns the configured connection ID from env vars
   */
  getSocialConnectionId(
    provider: "google" | "microsoft" | "apple",
  ): string | undefined {
    switch (provider) {
      case "google":
        return this.googleConnectionId;
      case "microsoft":
        return this.microsoftConnectionId;
      case "apple":
        return this.appleConnectionId;
      default:
        return undefined;
    }
  }

  /**
   * Map social provider to WorkOS provider type
   */
  getWorkOSProvider(
    provider: string,
  ): "GoogleOAuth" | "MicrosoftOAuth" | "AppleOAuth" | undefined {
    switch (provider) {
      case "google":
        return "GoogleOAuth";
      case "microsoft":
        return "MicrosoftOAuth";
      case "apple":
        return "AppleOAuth";
      default:
        return undefined;
    }
  }

  /**
   * Create a magic auth code for passwordless authentication (6-digit code)
   * This creates and emails a 6-digit one-time code to the user
   * @see https://workos.com/docs/reference/authkit/magic-auth/create
   */
  async createMagicAuth(email: string): Promise<MagicAuth> {
    return this.workos.userManagement.createMagicAuth({
      email,
    });
  }

  /**
   * Verify the 6-digit code and authenticate the user
   * Returns WorkOS user and tokens
   * @see https://workos.com/docs/reference/authkit/authentication/magic-auth
   */
  async authenticateWithMagicAuth(
    email: string,
    code: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthenticationResponse> {
    return this.workos.userManagement.authenticateWithMagicAuth({
      clientId: this.clientId,
      email,
      code,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Check if a provider is available (has connection ID configured)
   */
  isProviderAvailable(provider: "google" | "microsoft" | "apple"): boolean {
    const connectionId = this.getSocialConnectionId(provider);
    return connectionId !== undefined && connectionId !== "";
  }

  /**
   * Get list of available social providers
   */
  getAvailableProviders(): string[] {
    const providers: string[] = [];
    if (
      this.isProviderAvailable("google") ||
      this.getWorkOSProvider("google") !== undefined
    ) {
      providers.push("google");
    }
    if (
      this.isProviderAvailable("microsoft") ||
      this.getWorkOSProvider("microsoft") !== undefined
    ) {
      providers.push("microsoft");
    }
    if (
      this.isProviderAvailable("apple") ||
      this.getWorkOSProvider("apple") !== undefined
    ) {
      providers.push("apple");
    }
    return providers;
  }
}
