import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NamespaceScope } from '../entities/privilege.entity';

export class CreatePrivilegeDto {
  @ApiProperty({ description: 'Privilege code', example: 'users.read' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiPropertyOptional({ description: 'Privilege description', example: 'Read access to user resources' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Namespace scope for this privilege', enum: ['G', 'O', 'D', 'U'] })
  @IsEnum(NamespaceScope)
  @IsOptional()
  namespaceScope?: NamespaceScope;
}
