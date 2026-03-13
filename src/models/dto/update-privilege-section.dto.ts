import { IsString, IsOptional, IsInt, IsBoolean, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePrivilegeSectionDto {
  @ApiPropertyOptional({ description: 'Unique section code', example: 'products' })
  @IsString()
  @IsOptional()
  sectionCode?: string;

  @ApiPropertyOptional({ description: 'Display label', example: 'Products' })
  @IsString()
  @IsOptional()
  sectionLabel?: string;

  @ApiPropertyOptional({ description: 'Material Icon name', example: 'inventory_2' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: 'Display order', example: 10 })
  @IsInt()
  @Min(0)
  @IsOptional()
  seqNumber?: number;

  @ApiPropertyOptional({ description: 'Whether visible in menu', example: true })
  @IsBoolean()
  @IsOptional()
  visible?: boolean;
}
