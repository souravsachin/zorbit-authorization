import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtPayload } from './jwt.strategy';

/**
 * Guard that enforces namespace isolation.
 *
 * For Organization-scoped routes (O namespace):
 *   Validates that the orgId in the URL matches the org claim in the JWT.
 *
 * For User-scoped routes (U namespace):
 *   Validates that the userId in the URL matches the sub claim in the JWT.
 *
 * This prevents users from accessing resources outside their namespace.
 */
@Injectable()
export class NamespaceGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const params = request.params;

    // Organization namespace check
    if (params.orgId && params.orgId !== user.org) {
      throw new ForbiddenException(
        `Access denied: namespace mismatch for organization ${params.orgId}`,
      );
    }

    // User namespace check
    if (params.userId && params.userId !== user.sub) {
      throw new ForbiddenException(
        `Access denied: namespace mismatch for user ${params.userId}`,
      );
    }

    return true;
  }
}
