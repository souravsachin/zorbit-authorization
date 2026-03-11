import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * Request body for the policy evaluation endpoint.
 * Given a user, action, resource, and namespace context,
 * the policy engine returns allow or deny.
 */
export class AuthorizeRequestDto {
  @IsString()
  @IsNotEmpty()
  userHashId!: string;

  /** Privilege code being checked, e.g. 'users.read' */
  @IsString()
  @IsNotEmpty()
  action!: string;

  /** The resource type, e.g. 'users', 'roles' */
  @IsString()
  @IsNotEmpty()
  resource!: string;

  /** Namespace type (G, O, D, U) */
  @IsString()
  @IsNotEmpty()
  namespace!: string;

  /** Namespace identifier, e.g. O-92AF */
  @IsString()
  @IsNotEmpty()
  namespaceId!: string;

  /** Optional additional context for fine-grained decisions */
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
