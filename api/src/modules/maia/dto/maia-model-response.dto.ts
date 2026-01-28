import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MaiaModelResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  modelName: string;

  @ApiProperty()
  modelDisplayName: string;

  @ApiProperty()
  modelCategory: string;

  @ApiProperty()
  authenticationEndpoint: string;

  @ApiProperty()
  supportsDeepAnalysis: boolean;

  @ApiPropertyOptional()
  modelPriority?: number;

  @ApiPropertyOptional()
  systemPrompt?: string;

  @ApiPropertyOptional()
  analysisPrompt?: string;

  @ApiPropertyOptional()
  serverIp?: string;
}
