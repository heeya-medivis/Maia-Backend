import {
  IsString,
  IsBoolean,
  IsOptional,
  MaxLength,
  IsIn,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Validate,
} from 'class-validator';
import { OrganizationRole } from '../../../database/schema/users';

@ValidatorConstraint({ name: 'orgRolePair', async: false })
class OrgRolePairConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args?: ValidationArguments): boolean {
    if (!args) return true;
    const obj = args.object as UpdateUserDto;
    const hasOrg = obj.organization !== undefined && obj.organization !== null && obj.organization !== '';
    const hasRole = obj.role !== undefined && obj.role !== null;
    // Both must be set or both must be empty
    return hasOrg === hasRole;
  }

  defaultMessage(): string {
    return 'Organization and role must both be set or both be empty';
  }
}

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
  @IsIn(['manager', 'member'])
  @Validate(OrgRolePairConstraint)
  role?: OrganizationRole | null;

  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;
}
