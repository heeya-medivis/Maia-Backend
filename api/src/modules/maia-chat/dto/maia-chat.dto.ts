import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsInt, Min } from 'class-validator';

/**
 * Request: Create a new chat session
 * POST /api/maia-chat
 */
export class CreateSessionDto {
  @ApiProperty({ description: 'Provider session ID (e.g., Gemini session ID)' })
  @IsString()
  providerSessionId: string;

  @ApiProperty({ description: 'Session start time' })
  @IsDateString()
  startTime: string;
}

/**
 * Response: Session created
 */
export class CreateSessionResponseDto {
  @ApiProperty({ description: 'Our backend session ID' })
  sessionId: string;
}

/**
 * Request: Create a turn within a session
 * POST /api/maia-chat/:sessionId/turn
 */
export class CreateTurnDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Request timestamp' })
  @IsDateString()
  requestTime: string;

  @ApiProperty({ description: 'Response timestamp' })
  @IsDateString()
  responseTime: string;

  @ApiProperty({ description: 'Input text tokens' })
  @IsInt()
  @Min(0)
  inputTextTokens: number;

  @ApiProperty({ description: 'Input image tokens' })
  @IsInt()
  @Min(0)
  inputImageTokens: number;

  @ApiProperty({ description: 'Input audio tokens' })
  @IsInt()
  @Min(0)
  inputAudioTokens: number;

  @ApiProperty({ description: 'Output text tokens' })
  @IsInt()
  @Min(0)
  outputTextTokens: number;

  @ApiProperty({ description: 'Output audio tokens' })
  @IsInt()
  @Min(0)
  outputAudioTokens: number;
}

/**
 * Response: Session details
 */
export class SessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  providerSessionId: string;

  @ApiProperty()
  startTime: string;

  @ApiPropertyOptional()
  endTime?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  totalInputTextTokens: number;

  @ApiProperty()
  totalInputImageTokens: number;

  @ApiProperty()
  totalInputAudioTokens: number;

  @ApiProperty()
  totalOutputTextTokens: number;

  @ApiProperty()
  totalOutputAudioTokens: number;
}
