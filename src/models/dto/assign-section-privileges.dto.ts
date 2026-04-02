import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignSectionPrivilegesDto {
  @ApiProperty({
    description: 'Array of privilege IDs to assign to this section',
    example: ['PRV-A1B2', 'PRV-C3D4'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  privilegeIds!: string[];
}
