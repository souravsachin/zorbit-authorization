import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignPrivilegeDto {
  @ApiProperty({ description: 'Privilege short hash ID to assign', example: 'PRV-81F3' })
  @IsString()
  @IsNotEmpty()
  privilegeHashId!: string;
}
