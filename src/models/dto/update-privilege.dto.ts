import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePrivilegeDto {
  @ApiPropertyOptional({ description: 'Privilege name', example: 'Manage Users' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Privilege description', example: 'Allows managing user accounts' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Resource this privilege controls', example: 'users' })
  @IsString()
  @IsOptional()
  resource?: string;

  @ApiPropertyOptional({ description: 'Action allowed on the resource', example: 'write', enum: ['read', 'write', 'delete', 'admin'] })
  @IsString()
  @IsIn(['read', 'write', 'delete', 'admin'])
  @IsOptional()
  action?: string;
}
