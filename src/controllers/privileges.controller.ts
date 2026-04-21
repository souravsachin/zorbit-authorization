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
import { PrivilegesService } from '../services/privileges.service';
import { CreatePrivilegeDto } from '../models/dto/create-privilege.dto';
import { UpdatePrivilegeDto } from '../models/dto/update-privilege.dto';
import { AssignPrivilegeDto } from '../models/dto/assign-privilege.dto';
import { JwtAuthGuard } from '../middleware/jwt-auth.guard';
import { NamespaceGuard } from '../middleware/namespace.guard';
import { ZorbitPrivilegeGuard } from '../middleware/zorbit-privilege.guard';
import { RequirePrivileges } from '../middleware/decorators';
import { Privilege } from '../models/entities/privilege.entity';

/**
 * Privilege management endpoints, scoped to an organization namespace.
 * Also includes role-privilege assignment endpoints.
 */
@ApiTags('privileges')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, ZorbitPrivilegeGuard)
export class PrivilegesController {
  constructor(private readonly privilegesService: PrivilegesService) {}

  // ── Privilege CRUD ──────────────────────────────────────────────

  @Get('api/v1/O/:orgId/privileges')
  @UseGuards(NamespaceGuard)
  @RequirePrivileges('authorization.privilege.read')
  @ApiOperation({ summary: 'List privileges', description: 'List all privileges in an organization.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiResponse({ status: 200, description: 'List of privileges returned.' })
  async findAll(@Param('orgId') orgId: string): Promise<Partial<Privilege>[]> {
    return this.privilegesService.findAllByOrganization(orgId);
  }

  @Post('api/v1/O/:orgId/privileges')
  @UseGuards(NamespaceGuard)
  @RequirePrivileges('authorization.privilege.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create privilege', description: 'Create a new privilege in an organization.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiResponse({ status: 201, description: 'Privilege created successfully.' })
  async create(
    @Param('orgId') orgId: string,
    @Body() dto: CreatePrivilegeDto,
  ): Promise<Partial<Privilege>> {
    return this.privilegesService.create(orgId, dto);
  }

  @Get('api/v1/O/:orgId/privileges/:id')
  @UseGuards(NamespaceGuard)
  @RequirePrivileges('authorization.privilege.read')
  @ApiOperation({ summary: 'Get privilege', description: 'Get a specific privilege by hashId.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiParam({ name: 'id', description: 'Privilege short hash ID', example: 'PRV-81F3' })
  @ApiResponse({ status: 200, description: 'Privilege returned.' })
  @ApiResponse({ status: 404, description: 'Privilege not found.' })
  async findOne(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ): Promise<Partial<Privilege>> {
    return this.privilegesService.findOne(orgId, id);
  }

  @Put('api/v1/O/:orgId/privileges/:id')
  @UseGuards(NamespaceGuard)
  @RequirePrivileges('authorization.privilege.update')
  @ApiOperation({ summary: 'Update privilege', description: 'Update a privilege in an organization.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiParam({ name: 'id', description: 'Privilege short hash ID', example: 'PRV-81F3' })
  @ApiResponse({ status: 200, description: 'Privilege updated successfully.' })
  @ApiResponse({ status: 404, description: 'Privilege not found.' })
  async update(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePrivilegeDto,
  ): Promise<Partial<Privilege>> {
    return this.privilegesService.update(orgId, id, dto);
  }

  @Delete('api/v1/O/:orgId/privileges/:id')
  @UseGuards(NamespaceGuard)
  @RequirePrivileges('authorization.privilege.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete privilege', description: 'Soft-delete a privilege in an organization.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiParam({ name: 'id', description: 'Privilege short hash ID', example: 'PRV-81F3' })
  @ApiResponse({ status: 204, description: 'Privilege deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Privilege not found.' })
  async remove(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.privilegesService.remove(orgId, id);
  }

  // ── Role-Privilege Assignment ───────────────────────────────────

  @Get('api/v1/O/:orgId/roles/:roleId/privileges')
  @UseGuards(NamespaceGuard)
  @RequirePrivileges('authorization.privilege.read')
  @ApiOperation({ summary: 'List role privileges', description: 'List privileges assigned to a role.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiParam({ name: 'roleId', description: 'Role short hash ID', example: 'ROL-92AF' })
  @ApiResponse({ status: 200, description: 'List of privileges returned.' })
  async findByRole(
    @Param('orgId') orgId: string,
    @Param('roleId') roleId: string,
  ): Promise<Partial<Privilege>[]> {
    return this.privilegesService.findByRole(orgId, roleId);
  }

  @Post('api/v1/O/:orgId/roles/:roleId/privileges')
  @UseGuards(NamespaceGuard)
  @RequirePrivileges('authorization.privilege.assign')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign privileges to role', description: 'Assign one or more privileges to a role.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiParam({ name: 'roleId', description: 'Role short hash ID', example: 'ROL-92AF' })
  @ApiResponse({ status: 201, description: 'Privileges assigned successfully.' })
  async assignToRole(
    @Param('orgId') orgId: string,
    @Param('roleId') roleId: string,
    @Body() dto: AssignPrivilegeDto,
  ) {
    return this.privilegesService.assignToRole(orgId, roleId, dto.privilegeIds);
  }

  @Delete('api/v1/O/:orgId/roles/:roleId/privileges/:privId')
  @UseGuards(NamespaceGuard)
  @RequirePrivileges('authorization.privilege.revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke privilege from role', description: 'Revoke a privilege from a role.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiParam({ name: 'roleId', description: 'Role short hash ID', example: 'ROL-92AF' })
  @ApiParam({ name: 'privId', description: 'Privilege short hash ID', example: 'PRV-81F3' })
  @ApiResponse({ status: 204, description: 'Privilege revoked successfully.' })
  async revokeFromRole(
    @Param('orgId') orgId: string,
    @Param('roleId') roleId: string,
    @Param('privId') privId: string,
  ): Promise<void> {
    return this.privilegesService.revokeFromRole(orgId, roleId, privId);
  }
}
