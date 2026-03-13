import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePrivilegeSectionDto {
  @ApiProperty({ description: 'Unique section code', example: 'products' })
  @IsString()
  @IsNotEmpty()
  sectionCode!: string;

  @ApiProperty({ description: 'Display label', example: 'Products' })
  @IsString()
  @IsNotEmpty()
  sectionLabel!: string;

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
