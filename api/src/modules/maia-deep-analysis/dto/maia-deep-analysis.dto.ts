import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, Min } from 'class-validator';

/**
 * Request: Create a deep analysis
 * POST /api/maia-deep-analysis
 */
export class CreateDeepAnalysisDto {
  @ApiProperty({ description: 'Request timestamp' })
  @IsDateString()
  requestTime: string;

  @ApiProperty({ description: 'Input tokens' })
  @IsInt()
  @Min(0)
  inputTokens: number;

  @ApiProperty({ description: 'Output tokens' })
  @IsInt()
  @Min(0)
  outputTokens: number;
}

/**
 * Response: Deep analysis created
 */
export class CreateDeepAnalysisResponseDto {
  @ApiProperty({ description: 'Analysis ID' })
  analysisId: string;
}
