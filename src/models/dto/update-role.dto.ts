import { IsString, IsOptional, IsEnum } from 'class-validator';
import { RoleStatus } from '../entities/role.entity';

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(RoleStatus)
  @IsOptional()
  status?: RoleStatus;
}
