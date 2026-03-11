import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Request body for the policy evaluation endpoint.
 * Given a user, action, resource, and namespace context,
 * the policy engine returns allow or deny.
 */
export class AuthorizeRequestDto {
  @ApiProperty({ description: 'User short hash ID', example: 'U-81F3' })
  @IsString()
  @IsNotEmpty()
  userHashId!: string;

  /** Privilege code being checked, e.g. 'users.read' */
  @ApiProperty({ description: 'Privilege code being checked', example: 'users.read' })
  @IsString()
  @IsNotEmpty()
  action!: string;

  /** The resource type, e.g. 'users', 'roles' */
  @ApiProperty({ description: 'Resource type', example: 'users' })
  @IsString()
  @IsNotEmpty()
  resource!: string;

  /** Namespace type (G, O, D, U) */
  @ApiProperty({ description: 'Namespace type', example: 'O', enum: ['G', 'O', 'D', 'U'] })
  @IsString()
  @IsNotEmpty()
  namespace!: string;

  /** Namespace identifier, e.g. O-92AF */
  @ApiProperty({ description: 'Namespace identifier', example: 'O-92AF' })
  @IsString()
  @IsNotEmpty()
  namespaceId!: string;

  /** Optional additional context for fine-grained decisions */
  @ApiPropertyOptional({ description: 'Additional context for fine-grained decisions', example: { department: 'engineering' } })
  @IsOptional()
  context?: Record<string, string>;
}

export interface AuthorizeResponseDto {
  allowed: boolean;
  userHashId: string;
  action: string;
  resource: string;
  namespace: string;
  namespaceId: string;
  evaluatedAt: string;
  reason?: string;
}
