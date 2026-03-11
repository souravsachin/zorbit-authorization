import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRoleDto {
  @ApiProperty({ description: 'Role short hash ID to assign', example: 'ROL-92AF' })
  @IsString()
  @IsNotEmpty()
  roleHashId!: string;
}
