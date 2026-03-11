import { IsString, IsNotEmpty } from 'class-validator';

export class AssignPrivilegeDto {
  @IsString()
  @IsNotEmpty()
  privilegeHashId!: string;
}
