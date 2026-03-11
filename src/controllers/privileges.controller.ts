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
import { PrivilegesService } from '../services/privileges.service';
import { CreatePrivilegeDto } from '../models/dto/create-privilege.dto';
import { AssignPrivilegeDto } from '../models/dto/assign-privilege.dto';
import { JwtAuthGuard } from '../middleware/jwt-auth.guard';
import { NamespaceGuard } from '../middleware/namespace.guard';
import { Privilege } from '../models/entities/privilege.entity';

/**
 * Privilege management endpoints.
 * Global privilege definitions and role-privilege assignment.
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class PrivilegesController {
  constructor(private readonly privilegesService: PrivilegesService) {}

  /**
   * GET /api/v1/G/privileges
   * List all privilege definitions.
   */
  @Get('api/v1/G/privileges')
  async findAll(): Promise<Partial<Privilege>[]> {
    return this.privilegesService.findAll();
  }

  /**
   * POST /api/v1/G/privileges
   * Create a new privilege definition.
   */
  @Post('api/v1/G/privileges')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePrivilegeDto): Promise<Partial<Privilege>> {
    return this.privilegesService.create(dto);
  }

  /**
   * GET /api/v1/G/privileges/:privilegeId
   * Get a specific privilege by hashId.
   */
  @Get('api/v1/G/privileges/:privilegeId')
  async findOne(
    @Param('privilegeId') privilegeId: string,
  ): Promise<Partial<Privilege>> {
    return this.privilegesService.findOne(privilegeId);
  }

  /**
   * GET /api/v1/O/:orgId/roles/:roleId/privileges
   * List privileges assigned to a role.
   */
  @Get('api/v1/O/:orgId/roles/:roleId/privileges')
  @UseGuards(NamespaceGuard)
  async findByRole(
    @Param('orgId') orgId: string,
    @Param('roleId') roleId: string,
  ): Promise<Partial<Privilege>[]> {
    return this.privilegesService.findByRole(orgId, roleId);
  }

  /**
   * POST /api/v1/O/:orgId/roles/:roleId/privileges
   * Assign a privilege to a role.
   */
  @Post('api/v1/O/:orgId/roles/:roleId/privileges')
  @UseGuards(NamespaceGuard)
  @HttpCode(HttpStatus.CREATED)
  async assignToRole(
    @Param('orgId') orgId: string,
    @Param('roleId') roleId: string,
    @Body() dto: AssignPrivilegeDto,
  ): Promise<{ roleHashId: string; privilegeHashId: string; assignedAt: Date }> {
    return this.privilegesService.assignToRole(orgId, roleId, dto.privilegeHashId);
  }

  /**
   * DELETE /api/v1/O/:orgId/roles/:roleId/privileges/:privilegeId
   * Revoke a privilege from a role.
   */
  @Delete('api/v1/O/:orgId/roles/:roleId/privileges/:privilegeId')
  @UseGuards(NamespaceGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeFromRole(
    @Param('orgId') orgId: string,
    @Param('roleId') roleId: string,
    @Param('privilegeId') privilegeId: string,
  ): Promise<void> {
    return this.privilegesService.revokeFromRole(orgId, roleId, privilegeId);
  }
}
