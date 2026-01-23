import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OpenAIAuthResponse {
  apiKey: string;
  requestUrl: string;
  webSocketBaseUrl: string;
}

@Injectable()
export class OpenAIService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Get OpenAI authentication data
   * Matches C# OpenAIAPIController.Auth()
   */
  getAuthData(): OpenAIAuthResponse {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    return {
      apiKey: apiKey!,
      requestUrl: 'https://api.openai.com/v1/chat/completions',
      webSocketBaseUrl: 'wss://api.openai.com/v1/realtime',
    };
  }
}
