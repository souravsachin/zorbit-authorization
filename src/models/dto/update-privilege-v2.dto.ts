import { IsString, IsOptional, IsInt, IsBoolean, Min, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePrivilegeV2Dto {
  @ApiPropertyOptional({
    description: 'Dot-notation privilege code',
    example: 'products.configurator.read',
  })
  @IsString()
  @IsOptional()
  @Matches(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/, {
    message: 'privilege_code must be dot-notation lowercase, e.g. products.configurator.read',
  })
  privilegeCode?: string;

  @ApiPropertyOptional({ description: 'Display label', example: 'Product Configurator (Read)' })
  @IsString()
  @IsOptional()
  privilegeLabel?: string;

  @ApiPropertyOptional({
    description: 'Section ID (SEC-XXXX)',
    example: 'SEC-A1B2',
  })
  @IsString()
  @IsOptional()
  sectionId?: string;

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
