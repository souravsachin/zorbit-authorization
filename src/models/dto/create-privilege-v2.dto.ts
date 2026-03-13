import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, Min, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePrivilegeV2Dto {
  @ApiProperty({
    description: 'Dot-notation privilege code',
    example: 'products.configurator.read',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/, {
    message: 'privilege_code must be dot-notation lowercase, e.g. products.configurator.read',
  })
  privilegeCode!: string;

  @ApiProperty({ description: 'Display label', example: 'Product Configurator (Read)' })
  @IsString()
  @IsNotEmpty()
  privilegeLabel!: string;

  @ApiProperty({
    description: 'Section ID (SEC-XXXX)',
    example: 'SEC-A1B2',
  })
  @IsString()
  @IsNotEmpty()
  sectionId!: string;

  @ApiPropertyOptional({
    description: 'Frontend route handlebars template',
    example: '/org/{{org_id}}/products/configurator',
  })
  @IsString()
  @IsOptional()
  feRouteConfig?: string;

  @ApiPropertyOptional({
    description: 'Backend API path template',
    example: '/api/v1/O/{{org_id}}/products/configurator',
  })
  @IsString()
  @IsOptional()
  beRouteConfig?: string;

  @ApiPropertyOptional({ description: 'Material Icon name', example: 'settings' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: 'Whether visible as a menu item', example: true })
  @IsBoolean()
  @IsOptional()
  visibleInMenu?: boolean;

  @ApiPropertyOptional({ description: 'Display order within section', example: 1 })
  @IsInt()
  @Min(0)
  @IsOptional()
  seqNumber?: number;
}
