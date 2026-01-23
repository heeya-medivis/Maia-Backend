import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  ValidateIf,
  IsIP,
} from 'class-validator';

export enum Provider {
  Invalid = 0,
  GCloud = 1,
  OpenAI = 2,
  SELF = 3,
}

export enum ModelCategory {
  Balanced = 0,
  Thinking = 1,
  Live = 2,
}

export enum HostProvider {
  Invalid = 0,
  AWS_EC2 = 1,
}

export class CreateMaiaModelDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  modelName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  modelDisplayName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  modelPriority?: number;

  @ApiProperty({ enum: ModelCategory })
  @IsEnum(ModelCategory)
  modelCategory: ModelCategory;

  @ApiProperty({ enum: Provider })
  @IsEnum(Provider)
  provider: Provider;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pricing?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Host info for self-hosted models
  @ApiPropertyOptional({ enum: HostProvider })
  @ValidateIf((o) => o.provider === Provider.SELF && o.serverIp)
  @IsEnum(HostProvider)
  hostProvider?: HostProvider;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.provider === Provider.SELF)
  @IsOptional()
  @IsIP('4', { message: 'Please enter a valid IPv4 address.' })
  serverIp?: string;
}

export class UpdateMaiaModelDto extends CreateMaiaModelDto {}
