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
import { UserRolesService } from '../services/user-roles.service';
import { AssignRoleDto } from '../models/dto/assign-role.dto';
import { JwtAuthGuard } from '../middleware/jwt-auth.guard';
import { NamespaceGuard } from '../middleware/namespace.guard';

/**
 * User-role assignment endpoints, scoped to an organization namespace.
 */
@Controller('api/v1/O/:orgId/users/:userId/roles')
@UseGuards(JwtAuthGuard, NamespaceGuard)
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  /**
   * GET /api/v1/O/:orgId/users/:userId/roles
   * List all roles assigned to a user in an organization.
   */
  @Get()
  async findRolesForUser(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
  ): Promise<{ roleHashId: string; roleName: string; assignedAt: Date }[]> {
    return this.userRolesService.findRolesForUser(orgId, userId);
  }

  /**
   * POST /api/v1/O/:orgId/users/:userId/roles
   * Assign a role to a user in an organization.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async assignRole(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Body() dto: AssignRoleDto,
  ): Promise<{ userHashId: string; roleHashId: string; assignedAt: Date }> {
    return this.userRolesService.assignRole(orgId, userId, dto.roleHashId);
  }

  /**
   * DELETE /api/v1/O/:orgId/users/:userId/roles/:roleId
   * Remove a role from a user in an organization.
   */
  @Delete(':roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRole(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ): Promise<void> {
    return this.userRolesService.removeRole(orgId, userId, roleId);
  }
}
