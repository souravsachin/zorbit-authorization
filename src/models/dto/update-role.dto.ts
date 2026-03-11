import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RoleStatus } from '../entities/role.entity';

export class UpdateRoleDto {
  @ApiPropertyOptional({ description: 'Role name', example: 'editor' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Role description', example: 'Editor role with write access' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Role status', enum: ['active', 'inactive'] })
  @IsEnum(RoleStatus)
  @IsOptional()
  status?: RoleStatus;
}
