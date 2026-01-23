import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
  constructor(private readonly configService: ConfigService) {}

  /**
   * Get Google Cloud authentication data
   * Matches C# GCloudAPIController.Auth()
   */
  async getAuthData(): Promise<GCloudAuthResponse> {
    const { accessToken, tokenExpiry } = await this.getAccessToken();
    const projectId = this.configService.get<string>('GCLOUD_PROJECT_ID');
    const serverLocation = this.configService.get<string>('GCLOUD_SERVER_LOCATION');

    return {
      gCloudProjectId: projectId!,
      gCloudServerLocation: serverLocation!,
      accessToken,
      tokenExpiry,
      webSocketBaseUrl: `wss://${serverLocation}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`,
      httpBaseUrl: `https://${serverLocation}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${serverLocation}/publishers/google/models/`,
      httpAdditionalOption: ':streamGenerateContent?alt=sse',
    };
  }

  /**
   * Refresh Google Cloud access token
   * Matches C# GCloudAPIController.RefreshToken()
   */
  async refreshToken(): Promise<{ accessToken: string; tokenExpiry: Date | null }> {
    return this.getAccessToken();
  }

  private async getAccessToken(): Promise<{ accessToken: string; tokenExpiry: Date | null }> {
    // In production, you'd use Google Cloud SDK or service account credentials
    // For now, we'll use environment variables similar to the C# implementation

    try {
      const credential = this.createCredentialFromConfig();
      
      // Use Google Auth Library to get access token
      // This requires @google-cloud/local-auth or google-auth-library package
      const accessToken = await this.fetchAccessToken(credential);
      
      // Token typically expires in 1 hour
      const tokenExpiry = new Date(Date.now() + 3600 * 1000);

      return { accessToken, tokenExpiry };
    } catch (error) {
      console.error('Failed to obtain Google Cloud access token:', error);
      throw error;
    }
  }

  private createCredentialFromConfig() {
    const clientEmail = this.configService.get<string>('GCLOUD_CLIENT_EMAIL');
    const privateKeyId = this.configService.get<string>('GCLOUD_PRIVATE_KEY_ID');
    const privateKey = this.configService
      .get<string>('GCLOUD_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');
    const projectId = this.configService.get<string>('GCLOUD_PROJECT_ID');

    return {
      type: 'service_account',
      project_id: projectId,
      private_key_id: privateKeyId,
      private_key: privateKey,
      client_email: clientEmail,
      client_id: '',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    };
  }

  private async fetchAccessToken(credential: any): Promise<string> {
    // For production, use google-auth-library:
    // const { GoogleAuth } = require('google-auth-library');
    // const auth = new GoogleAuth({ credentials: credential, scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    // const client = await auth.getClient();
    // const { token } = await client.getAccessToken();
    // return token;

    // Simplified implementation - in production, use proper Google Auth
    // This is a placeholder that should be replaced with actual implementation
    const jwt = await this.createJWT(credential);
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
    }

    return data.access_token;
  }

  private async createJWT(credential: any): Promise<string> {
    // This is a simplified JWT creation - in production use jsonwebtoken or jose
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: credential.private_key_id,
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: credential.client_email,
      sub: credential.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
    };

    // In production, sign with the private key using a proper JWT library
    // For now, throw an error to indicate this needs proper implementation
    throw new Error(
      'JWT signing not implemented. Please install google-auth-library and implement proper authentication.',
    );
  }
}
