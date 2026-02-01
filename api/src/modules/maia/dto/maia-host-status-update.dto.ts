import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsString, IsNotEmpty, ValidateIf } from "class-validator";

export class MaiaHostStatusUpdateDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  hostProvider: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.isActive === true)
  @IsString()
  @IsNotEmpty({ message: "ServerIp is required when activating a host." })
  serverIp?: string;
}
