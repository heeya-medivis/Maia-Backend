import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleAuth } from "google-auth-library";

export interface GCloudAuthResponse {
  gCloudProjectId: string;
  gCloudServerLocation: string;
  accessToken: string;
  tokenExpiry: Date | null;
  webSocketBaseUrl: string;
  httpBaseUrl: string;
  httpAdditionalOption: string;
}

@Injectable()
export class GCloudService {
  private readonly logger = new Logger(GCloudService.name);
  private authClient: GoogleAuth | null = null;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get Google Cloud authentication data
   * Matches C# GCloudAPIController.Auth()
   */
  async getAuthData(): Promise<GCloudAuthResponse> {
    const { accessToken, tokenExpiry } = await this.getAccessToken();
    const projectId = this.configService.get<string>("GCLOUD_PROJECT_ID");
    const serverLocation = this.configService.get<string>(
      "GCLOUD_SERVER_LOCATION",
    );

    return {
      gCloudProjectId: projectId!,
      gCloudServerLocation: serverLocation!,
      accessToken,
      tokenExpiry,
      webSocketBaseUrl: `wss://${serverLocation}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`,
      httpBaseUrl: `https://${serverLocation}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${serverLocation}/publishers/google/models/`,
      httpAdditionalOption: ":streamGenerateContent?alt=sse",
    };
  }

  /**
   * Refresh Google Cloud access token
   * Matches C# GCloudAPIController.RefreshToken()
   */
  async refreshToken(): Promise<{
    accessToken: string;
    tokenExpiry: Date | null;
  }> {
    return this.getAccessToken();
  }

  private async getAccessToken(): Promise<{
    accessToken: string;
    tokenExpiry: Date | null;
  }> {
    try {
      const auth = this.getAuthClient();
      const client = await auth.getClient();
      const { token, res } = await client.getAccessToken();

      if (!token) {
        throw new Error("Failed to obtain access token from Google");
      }

      // Extract expiry from response or default to 1 hour
      let tokenExpiry: Date;
      if (res?.data?.expiry_date) {
        tokenExpiry = new Date(res.data.expiry_date);
      } else {
        // Default to 1 hour (Google access tokens typically expire in 1 hour)
        tokenExpiry = new Date(Date.now() + 3600 * 1000);
      }

      return { accessToken: token, tokenExpiry };
    } catch (error) {
      this.logger.error("Failed to obtain Google Cloud access token:", error);
      throw error;
    }
  }

  /**
   * Get or create the Google Auth client (lazy initialization with caching)
   */
  private getAuthClient(): GoogleAuth {
    if (!this.authClient) {
      const credentials = this.createCredentialFromConfig();
      this.authClient = new GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      });
    }
    return this.authClient;
  }

  private createCredentialFromConfig() {
    const clientEmail = this.configService.get<string>("GCLOUD_CLIENT_EMAIL");
    const privateKeyId = this.configService.get<string>(
      "GCLOUD_PRIVATE_KEY_ID",
    );
    const privateKey = this.configService
      .get<string>("GCLOUD_PRIVATE_KEY")
      ?.replace(/\\n/g, "\n");
    const projectId = this.configService.get<string>("GCLOUD_PROJECT_ID");

    if (!clientEmail || !privateKey || !projectId) {
      throw new Error(
        "Missing Google Cloud credentials. Ensure GCLOUD_CLIENT_EMAIL, GCLOUD_PRIVATE_KEY, and GCLOUD_PROJECT_ID are set.",
      );
    }

    return {
      type: "service_account" as const,
      project_id: projectId,
      private_key_id: privateKeyId,
      private_key: privateKey,
      client_email: clientEmail,
      client_id: "",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    };
  }
}
