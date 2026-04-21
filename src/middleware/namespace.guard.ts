import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './decorators';

/**
 * Guard that enforces namespace isolation.
 *
 * For Organization-scoped routes (O namespace):
 *   Validates that the orgId in the URL matches the org claim in the JWT.
 *
 * For User-scoped routes (U namespace):
 *   - Self-operations (userId === JWT sub) are always allowed.
 *   - Users with 'platform.namespace.bypass' privilege can operate cross-org/cross-user.
 *   - Otherwise the request is rejected.
 *
 * This prevents users from accessing resources outside their namespace
 * while allowing privileged users to manage resources across namespaces.
 */
@Injectable()
export class NamespaceGuard implements CanActivate {
  private readonly logger = new Logger(NamespaceGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip namespace check for @Public() routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const params = request.params;
    const canBypass = user.privileges?.includes('platform.namespace.bypass');

    // Organization namespace check
    if (params.orgId && params.orgId !== user.org) {
      if (canBypass) {
        this.logger.log(
          `Privileged user ${user.sub} accessing org ${params.orgId} (own org: ${user.org})`,
        );
        return true;
      }
      throw new ForbiddenException(
        `Access denied: namespace mismatch for organization ${params.orgId}`,
      );
    }

    // User namespace check
    if (params.userId && params.userId !== user.sub) {
      if (canBypass) {
        this.logger.log(
          `Privileged user ${user.sub} operating on user ${params.userId} in org ${user.org}`,
        );
        return true;
      }
      throw new ForbiddenException(
        `Access denied: namespace mismatch for user ${params.userId}`,
      );
    }

    return true;
  }
}
