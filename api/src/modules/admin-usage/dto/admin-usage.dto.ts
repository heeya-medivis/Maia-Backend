import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

/**
 * Query parameters for date range filtering
 */
export class DateRangeQueryDto {
  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * Overall usage statistics response
 */
export class OverallStatsResponseDto {
  @ApiProperty()
  totalUsers: number;

  @ApiProperty()
  totalOrganizations: number;

  @ApiProperty()
  totalChatSessions: number;

  @ApiProperty()
  totalChatInputTokens: number;

  @ApiProperty()
  totalChatOutputTokens: number;

  @ApiProperty()
  totalTokens: number;

  @ApiProperty()
  activeChatSessions: number;
}

/**
 * Usage statistics per user
 */
export class UserUsageStatsDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiPropertyOptional()
  organization: string | null;

  @ApiProperty()
  chatSessionCount: number;

  @ApiProperty()
  chatInputTokens: number;

  @ApiProperty()
  chatOutputTokens: number;

  @ApiProperty()
  totalTokens: number;
}

/**
 * Usage statistics per organization
 */
export class OrganizationUsageStatsDto {
  @ApiProperty()
  organization: string;

  @ApiProperty()
  userCount: number;

  @ApiProperty()
  chatSessionCount: number;

  @ApiProperty()
  chatInputTokens: number;

  @ApiProperty()
  chatOutputTokens: number;

  @ApiProperty()
  totalTokens: number;
}

/**
 * Chat session data
 */
export class ChatSessionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  providerSessionId: string;

  @ApiProperty()
  startTime: Date;

  @ApiPropertyOptional()
  endTime: Date | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  totalInputTextTokens: number;

  @ApiProperty()
  totalInputImageTokens: number;

  @ApiProperty()
  totalInputAudioTokens: number;

  @ApiProperty()
  totalInputTextCachedTokens: number;

  @ApiProperty()
  totalInputImageCachedTokens: number;

  @ApiProperty()
  totalInputAudioCachedTokens: number;

  @ApiProperty()
  totalOutputTextTokens: number;

  @ApiProperty()
  totalOutputImageTokens: number;

  @ApiProperty()
  totalOutputAudioTokens: number;

  @ApiProperty()
  totalOutputReasoningTokens: number;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  updatedAt: Date | null;
}

/**
 * User info for detail view
 */
export class UserInfoDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiPropertyOptional()
  organization: string | null;
}

/**
 * User detail response with sessions
 */
export class UserDetailResponseDto {
  @ApiProperty({ type: UserInfoDto })
  user: UserInfoDto;

  @ApiProperty({ type: [ChatSessionDto] })
  chatSessions: ChatSessionDto[];
}

/**
 * Organization user info
 */
export class OrgUserInfoDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;
}

/**
 * Organization detail response with users and sessions
 */
export class OrganizationDetailResponseDto {
  @ApiProperty()
  organization: string;

  @ApiProperty({ type: [OrgUserInfoDto] })
  users: OrgUserInfoDto[];

  @ApiProperty({ type: [ChatSessionDto] })
  chatSessions: ChatSessionDto[];
}
