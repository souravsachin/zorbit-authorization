import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { NamespaceScope } from '../entities/privilege.entity';

export class CreatePrivilegeDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(NamespaceScope)
  @IsOptional()
  namespaceScope?: NamespaceScope;
}
