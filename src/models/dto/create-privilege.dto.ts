import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePrivilegeDto {
  @ApiProperty({ description: 'Privilege name', example: 'Manage Users' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Privilege description', example: 'Allows managing user accounts' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Resource this privilege controls', example: 'users' })
  @IsString()
  @IsNotEmpty()
  resource!: string;

  @ApiProperty({ description: 'Action allowed on the resource', example: 'write', enum: ['read', 'write', 'delete', 'admin'] })
  @IsString()
  @IsIn(['read', 'write', 'delete', 'admin'])
  action!: string;
}
