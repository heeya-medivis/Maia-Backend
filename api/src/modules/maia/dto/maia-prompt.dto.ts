import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, IsNotEmpty, IsEnum } from 'class-validator';

export enum PromptType {
  Invalid = 0,
  SystemPrompt = 1,
  AnalysisPrompt = 2,
}

export class MaiaPromptDto {
  @ApiProperty({ enum: PromptType })
  @IsEnum(PromptType)
  type: PromptType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}
