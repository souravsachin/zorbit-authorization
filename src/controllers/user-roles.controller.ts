import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
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
