import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UserRolesService } from '../services/user-roles.service';
import { AssignRoleDto } from '../models/dto/assign-role.dto';
import { JwtAuthGuard } from '../middleware/jwt-auth.guard';
import { NamespaceGuard } from '../middleware/namespace.guard';
import { ZorbitPrivilegeGuard } from '../middleware/zorbit-privilege.guard';
import { RequirePrivileges } from '../middleware/decorators';

/**
 * User-role assignment endpoints, scoped to an organization namespace.
 */
@ApiTags('user-roles')
@ApiBearerAuth()
@Controller('api/v1/O/:orgId/users/:userId/roles')
@UseGuards(JwtAuthGuard, NamespaceGuard, ZorbitPrivilegeGuard)
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  @Get()
  @RequirePrivileges('authorization.userrole.read')
  @ApiOperation({ summary: 'List user roles', description: 'List all roles assigned to a user in an organization.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiParam({ name: 'userId', description: 'User short hash ID', example: 'U-81F3' })
  @ApiResponse({ status: 200, description: 'List of user roles returned.' })
  async findRolesForUser(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
  ): Promise<{ roleHashId: string; roleName: string; assignedAt: Date }[]> {
    return this.userRolesService.findRolesForUser(orgId, userId);
  }

  @Post()
  @RequirePrivileges('authorization.userrole.assign')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign role to user', description: 'Assign a role to a user in an organization.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiParam({ name: 'userId', description: 'User short hash ID', example: 'U-81F3' })
  @ApiResponse({ status: 201, description: 'Role assigned successfully.' })
  async assignRole(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Body() dto: AssignRoleDto,
  ): Promise<{ userHashId: string; roleHashId: string; assignedAt: Date }> {
    return this.userRolesService.assignRole(orgId, userId, dto.roleHashId);
  }

  @Delete(':roleId')
  @RequirePrivileges('authorization.userrole.revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove role from user', description: 'Remove a role from a user in an organization.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiParam({ name: 'userId', description: 'User short hash ID', example: 'U-81F3' })
  @ApiParam({ name: 'roleId', description: 'Role short hash ID', example: 'ROL-92AF' })
  @ApiResponse({ status: 204, description: 'Role removed successfully.' })
  async removeRole(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ): Promise<void> {
    return this.userRolesService.removeRole(orgId, userId, roleId);
  }
}

/**
 * User privilege resolution endpoint (separate controller for the privilege path).
 * Used by the navigation service to filter menu items by user privileges.
 */
@ApiTags('user-privileges')
@ApiBearerAuth()
@Controller('api/v1/O/:orgId/users/:userId/privileges')
@UseGuards(JwtAuthGuard, NamespaceGuard, ZorbitPrivilegeGuard)
export class UserPrivilegesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  @Get()
  @ApiOperation({
    summary: 'List user privilege codes',
    description: 'Get all privilege codes for a user, resolved through their roles. Used by navigation service for menu filtering.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiParam({ name: 'userId', description: 'User short hash ID', example: 'U-81F3' })
  @ApiResponse({ status: 200, description: 'List of privilege codes returned.' })
  async getPrivilegeCodes(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
  ): Promise<{ privilegeCodes: string[] }> {
    const privilegeCodes = await this.userRolesService.getPrivilegeCodesForUser(orgId, userId);
    return { privilegeCodes };
  }
}

/**
 * Self-namespace user routes for the SPA.
 *
 * Mounted at `/api/v1/U/:userId/...` so the SPA can fetch the
 * caller's own roles and privileges immediately after login,
 * without needing the org id in the URL. Cycle 102 (2026-04-25)
 * caught these as 404s — the controllers were never declared.
 *
 * Authorisation contract (see `NamespaceGuard`):
 *   - Self-callers (`params.userId === req.user.sub`) are always allowed.
 *   - Otherwise the caller must hold `platform.namespace.bypass`.
 *
 * Org context is resolved from the JWT (`req.user.org`); these are
 * deliberately NOT org-scoped at the URL level, because the SPA
 * does not know the user's org id at the moment of the call.
 *
 * Empty arrays are returned (NOT 404) when the user has no roles
 * or privileges — the SPA depends on this to render a clean
 * "no access yet" UI rather than an error.
 */
@ApiTags('user-self')
@ApiBearerAuth()
@Controller('api/v1/U/:userId')
@UseGuards(JwtAuthGuard, NamespaceGuard)
export class UserSelfRolesController {
  private readonly logger = new Logger(UserSelfRolesController.name);

  constructor(private readonly userRolesService: UserRolesService) {}

  /**
   * GET /api/v1/U/:userId/roles
   * Returns the user's role assignments in their own org. Used by the
   * SPA after login to populate the "My Roles" panel and to drive
   * client-side privilege gating.
   */
  @Get('roles')
  @ApiOperation({
    summary: 'List self roles',
    description:
      'List the calling user\'s role assignments. Org is resolved from ' +
      'the JWT. Empty array (not 404) when the user has no roles.',
  })
  @ApiParam({ name: 'userId', description: 'User short hash ID', example: 'U-81F3' })
  @ApiResponse({
    status: 200,
    description: 'List of role assignments.',
    schema: {
      example: [
        { roleHashId: 'R-SADMIN', roleName: 'Super Admin', scope: 'O', scopeId: 'O-ROOT' },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Missing/invalid JWT.' })
  @ApiResponse({ status: 403, description: 'Cross-user read without bypass privilege.' })
  async getSelfRoles(
    @Param('userId') userId: string,
    @Req() req: any,
  ): Promise<{ roleHashId: string; roleName: string; scope: string; scopeId: string }[]> {
    const orgId: string | undefined = req.user?.org;
    if (!orgId) {
      this.logger.warn(`getSelfRoles: JWT for ${userId} has no org claim`);
      return [];
    }

    const roles = await this.userRolesService.findRolesForUser(orgId, userId);
    return roles.map((r) => ({
      roleHashId: r.roleHashId,
      roleName: r.roleName,
      scope: 'O',
      scopeId: orgId,
    }));
  }

  /**
   * GET /api/v1/U/:userId/privileges
   * Returns the user's resolved privilege codes in their own org.
   * Each entry includes a `source` ("role") to leave room for future
   * direct-grant or policy-derived sources without a contract change.
   */
  @Get('privileges')
  @ApiOperation({
    summary: 'List self privileges',
    description:
      'List the calling user\'s resolved privilege codes. Org is ' +
      'resolved from the JWT. Empty array (not 404) when the user ' +
      'has no privileges.',
  })
  @ApiParam({ name: 'userId', description: 'User short hash ID', example: 'U-81F3' })
  @ApiResponse({
    status: 200,
    description: 'List of resolved privilege codes.',
    schema: {
      example: [
        { code: 'identity.user.read', source: 'role' },
        { code: 'authorization.role.read', source: 'role' },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Missing/invalid JWT.' })
  @ApiResponse({ status: 403, description: 'Cross-user read without bypass privilege.' })
  async getSelfPrivileges(
    @Param('userId') userId: string,
    @Req() req: any,
  ): Promise<{ code: string; source: string }[]> {
    const orgId: string | undefined = req.user?.org;
    if (!orgId) {
      this.logger.warn(`getSelfPrivileges: JWT for ${userId} has no org claim`);
      return [];
    }

    const codes = await this.userRolesService.getPrivilegeCodesForUser(orgId, userId);
    return codes.map((code) => ({ code, source: 'role' }));
  }
}

/**
 * Internal privilege resolution endpoint for service-to-service calls.
 * No JWT required — used by identity service during token issuance
 * to embed privilege codes in the JWT.
 *
 * This is a Global-scoped internal API. In production, restrict via
 * network policy or internal-only port binding.
 */
@ApiTags('internal')
@Controller('api/v1/G/internal/users')
export class InternalUserPrivilegesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  @Get(':orgId/:userId/privileges')
  @ApiOperation({
    summary: '[Internal] Resolve user privilege codes',
    description: 'Service-to-service endpoint for privilege resolution. No JWT required.',
  })
  async getPrivilegeCodes(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
  ): Promise<{ privilegeCodes: string[] }> {
    const privilegeCodes = await this.userRolesService.getPrivilegeCodesForUser(orgId, userId);
    return { privilegeCodes };
  }
}
