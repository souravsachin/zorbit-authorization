import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { RolesService } from '../services/roles.service';
import { CreateRoleDto } from '../models/dto/create-role.dto';
import { UpdateRoleDto } from '../models/dto/update-role.dto';
import { JwtAuthGuard } from '../middleware/jwt-auth.guard';
import { NamespaceGuard } from '../middleware/namespace.guard';
import { ZorbitPrivilegeGuard } from '../middleware/zorbit-privilege.guard';
import { RequirePrivileges } from '../middleware/decorators';
import { Role } from '../models/entities/role.entity';

/**
 * Role management endpoints, scoped to an organization namespace.
 */
@ApiTags('roles')
@ApiBearerAuth()
@Controller('api/v1/O/:orgId/roles')
@UseGuards(JwtAuthGuard, NamespaceGuard, ZorbitPrivilegeGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePrivileges('authorization.role.read')
  @ApiOperation({ summary: 'List roles', description: 'List all roles in an organization.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiResponse({ status: 200, description: 'List of roles returned.' })
  async findAll(@Param('orgId') orgId: string): Promise<Partial<Role>[]> {
    return this.rolesService.findAllByOrganization(orgId);
  }

  /**
   * Lightweight count endpoint for roles in an organization.
   *
   * Cycle-105 E-OVERFETCH (MSG-082): SPA Roles page count badge
   * fetched the full role list just to read `length`. Returns
   * `{count}` only — ~30 bytes payload.
   * Re-uses `authorization.role.read` privilege.
   */
  @Get('_count')
  @RequirePrivileges('authorization.role.read')
  @ApiOperation({
    summary: 'Count roles',
    description:
      'Count roles in an organization. Returns {count: N} only — ~30 bytes vs full list payload.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiResponse({ status: 200, description: 'Role count returned.' })
  async countRoles(@Param('orgId') orgId: string): Promise<{ count: number }> {
    return this.rolesService.countByOrganization(orgId);
  }

  @Post()
  @RequirePrivileges('authorization.role.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create role', description: 'Create a new role in an organization.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiResponse({ status: 201, description: 'Role created successfully.' })
  async create(
    @Param('orgId') orgId: string,
    @Body() dto: CreateRoleDto,
  ): Promise<Partial<Role>> {
    return this.rolesService.create(orgId, dto);
  }

  @Get(':roleId')
  @RequirePrivileges('authorization.role.read')
  @ApiOperation({ summary: 'Get role', description: 'Get a single role by hashId within an organization.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiParam({ name: 'roleId', description: 'Role short hash ID', example: 'ROL-92AF' })
  @ApiResponse({ status: 200, description: 'Role returned.' })
  @ApiResponse({ status: 404, description: 'Role not found.' })
  async findOne(
    @Param('orgId') orgId: string,
    @Param('roleId') roleId: string,
  ): Promise<Partial<Role>> {
    return this.rolesService.findOne(orgId, roleId);
  }

  @Put(':roleId')
  @RequirePrivileges('authorization.role.update')
  @ApiOperation({ summary: 'Update role', description: 'Update a role within an organization.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiParam({ name: 'roleId', description: 'Role short hash ID', example: 'ROL-92AF' })
  @ApiResponse({ status: 200, description: 'Role updated successfully.' })
  @ApiResponse({ status: 404, description: 'Role not found.' })
  async update(
    @Param('orgId') orgId: string,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<Partial<Role>> {
    return this.rolesService.update(orgId, roleId, dto);
  }

  @Delete(':roleId')
  @RequirePrivileges('authorization.role.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete role', description: 'Delete a role within an organization.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiParam({ name: 'roleId', description: 'Role short hash ID', example: 'ROL-92AF' })
  @ApiResponse({ status: 204, description: 'Role deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Role not found.' })
  async remove(
    @Param('orgId') orgId: string,
    @Param('roleId') roleId: string,
  ): Promise<void> {
    return this.rolesService.remove(orgId, roleId);
  }
}
