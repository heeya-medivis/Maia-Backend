import { IsString, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';

export enum DeviceType {
  Desktop = 'desktop',
  XR = 'xr',
  Mobile = 'mobile',
  Web = 'web',
}

export enum Platform {
  Windows = 'windows',
  MacOS = 'macos',
  Linux = 'linux',
  iOS = 'ios',
  Android = 'android',
  Quest = 'quest',
  VisionPro = 'visionpro',
  Web = 'web',
}

export class DeviceInfoDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;

  @IsOptional()
  @IsString()
  appVersion?: string;

  @IsOptional()
  @IsString()
  osVersion?: string;
}

export class InitiateHandoffDto {
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  deviceId: string;

  @IsOptional()
  deviceInfo?: DeviceInfoDto;
}

export class CallbackDto {
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  deviceId: string;

  @IsString()
  @MinLength(1)
  clerkSessionToken: string;

  @IsOptional()
  @IsString()
  @MinLength(16)
  @MaxLength(64)
  pollToken?: string; // Poll token from handoff/initiate (for secure polling)
}

export class DeviceTokenDto {
  @IsString()
  @MinLength(8)
  @MaxLength(24)
  code: string;

  @IsOptional()
  deviceInfo?: DeviceInfoDto;
}

export class RefreshTokenDto {
  @IsString()
  @MinLength(16)
  refreshToken: string;
}

// Response DTOs
export class HandoffInitiateResponseDto {
  success: boolean;
  authUrl: string;
  deviceId: string;
  pollToken: string; // Secret token Unity must provide when polling
  message: string;
}

export class HandoffPollResponseDto {
  status: 'pending' | 'ready' | 'expired';
  message?: string;
  code?: string;
  expiresAt?: string;
}

export class CallbackResponseDto {
  success: boolean;
  code: string;
  deepLink: string;
  expiresAt: string;
}

export class TokenResponseDto {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  refreshExpiresAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  };
}

export class MeResponseDto {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
    emailVerified: boolean;
  };
  devices: Array<{
    id: string;
    name: string | null;
    deviceType: string | null;
    platform: string | null;
    lastActiveAt: Date | null;
    isActive: boolean;
  }>;
  currentDeviceId: string | null;
}
