import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from './jwt.strategy';
import { UserRole } from '../models/entities/user-role.entity';
import { Role } from '../models/entities/role.entity';

/** Role names that grant admin-level access to operate on other users within the same org. */
const ADMIN_ROLE_NAMES = ['org-admin', 'super-admin'];

/**
 * Guard that enforces namespace isolation.
 *
 * For Organization-scoped routes (O namespace):
 *   Validates that the orgId in the URL matches the org claim in the JWT.
 *
 * For User-scoped routes (U namespace):
 *   - Self-operations (userId === JWT sub) are always allowed.
 *   - Admin operations (userId !== JWT sub) are allowed if the authenticated
 *     user holds an "org-admin" or "super-admin" role within the SAME org.
 *   - Otherwise the request is rejected.
 *
 * This prevents users from accessing resources outside their namespace
 * while allowing admins to manage users within their organization.
 */
@Injectable()
export class NamespaceGuard implements CanActivate {
  private readonly logger = new Logger(NamespaceGuard.name);

  constructor(
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
      // Target user differs from authenticated user — check for admin role
      const isAdmin = await this.hasAdminRole(user.sub, user.org);
      if (!isAdmin) {
        throw new ForbiddenException(
          `Access denied: namespace mismatch for user ${params.userId}`,
        );
      }
      this.logger.log(
        `Admin ${user.sub} operating on user ${params.userId} in org ${user.org}`,
      );
    }

    return true;
  }

  /**
   * Check whether the authenticated user holds an admin role in the given org.
   * Looks up user_roles -> roles to find role names matching ADMIN_ROLE_NAMES.
   */
  private async hasAdminRole(
    userHashId: string,
    orgHashId: string,
  ): Promise<boolean> {
    const userRoles = await this.userRoleRepository.find({
      where: { userHashId, organizationHashId: orgHashId },
    });

    if (userRoles.length === 0) {
      return false;
    }

    const roleHashIds = userRoles.map((ur) => ur.roleHashId);

    // Check if any of the user's roles are admin roles
    for (const roleHashId of roleHashIds) {
      const role = await this.roleRepository.findOne({
        where: { hashId: roleHashId, organizationHashId: orgHashId },
      });
      if (role && ADMIN_ROLE_NAMES.includes(role.name)) {
        return true;
      }
    }

    return false;
  }
}
