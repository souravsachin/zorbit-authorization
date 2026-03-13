import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignPrivilegeV2Dto {
  @ApiProperty({
    description: 'Array of privilege IDs (PRV-XXXX) to assign to the role',
    example: ['PRV-81F3', 'PRV-A2B4'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  privilegeIds!: string[];
}
