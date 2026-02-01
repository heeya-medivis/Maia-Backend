import { IsString, IsOptional, MaxLength } from "class-validator";

/**
 * DTO for users updating their own profile.
 * Only allows firstName and lastName - no admin fields like organization, role, isAdmin.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;
}
