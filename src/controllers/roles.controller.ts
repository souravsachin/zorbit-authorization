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
import { RolesService } from '../services/roles.service';
import { CreateRoleDto } from '../models/dto/create-role.dto';
import { UpdateRoleDto } from '../models/dto/update-role.dto';
import { JwtAuthGuard } from '../middleware/jwt-auth.guard';
import { NamespaceGuard } from '../middleware/namespace.guard';
import { Role } from '../models/entities/role.entity';

/**
 * Role management endpoints, scoped to an organization namespace.
 * All routes enforce namespace isolation via orgId.
 */
@Controller('api/v1/O/:orgId/roles')
@UseGuards(JwtAuthGuard, NamespaceGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * GET /api/v1/O/:orgId/roles
   * List all roles in an organization.
   */
  @Get()
  async findAll(@Param('orgId') orgId: string): Promise<Partial<Role>[]> {
    return this.rolesService.findAllByOrganization(orgId);
  }

  /**
   * POST /api/v1/O/:orgId/roles
   * Create a new role in an organization.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('orgId') orgId: string,
    @Body() dto: CreateRoleDto,
  ): Promise<Partial<Role>> {
    return this.rolesService.create(orgId, dto);
  }

  /**
   * GET /api/v1/O/:orgId/roles/:roleId
   * Get a single role by hashId within an organization.
   */
  @Get(':roleId')
  async findOne(
    @Param('orgId') orgId: string,
    @Param('roleId') roleId: string,
  ): Promise<Partial<Role>> {
    return this.rolesService.findOne(orgId, roleId);
  }

  /**
   * PUT /api/v1/O/:orgId/roles/:roleId
   * Update a role within an organization.
   */
  @Put(':roleId')
  async update(
    @Param('orgId') orgId: string,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<Partial<Role>> {
    return this.rolesService.update(orgId, roleId, dto);
  }

  /**
   * DELETE /api/v1/O/:orgId/roles/:roleId
   * Delete a role within an organization.
   */
  @Delete(':roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('orgId') orgId: string,
    @Param('roleId') roleId: string,
  ): Promise<void> {
    return this.rolesService.remove(orgId, roleId);
  }
}
