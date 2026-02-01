import { IsString, IsOptional, IsEnum, MinLength } from "class-validator";

export enum DeviceType {
  Desktop = "desktop",
  XR = "xr",
  Mobile = "mobile",
  Web = "web",
}

export enum Platform {
  Windows = "windows",
  MacOS = "macos",
  Linux = "linux",
  iOS = "ios",
  Android = "android",
  Quest = "quest",
  VisionPro = "visionpro",
  Web = "web",
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

export class RefreshTokenDto {
  @IsString()
  @MinLength(16)
  refreshToken: string;
}

// Response DTOs
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
  };
}

export class MeResponseDto {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    organization: string | null;
    role: string | null;
    isAdmin: boolean;
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
