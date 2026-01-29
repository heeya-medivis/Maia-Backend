import { IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  organization?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  role?: string | null;

  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;
}
