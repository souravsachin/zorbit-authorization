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
import { PrivilegesV2Service } from '../services/privileges-v2.service';
import { CreatePrivilegeV2Dto } from '../models/dto/create-privilege-v2.dto';
import { UpdatePrivilegeV2Dto } from '../models/dto/update-privilege-v2.dto';
import { AssignPrivilegeV2Dto } from '../models/dto/assign-privilege-v2.dto';
import { JwtAuthGuard } from '../middleware/jwt-auth.guard';
import { PrivilegeV2 } from '../models/entities/privilege-v2.entity';

/**
 * Navigation-driven privilege CRUD and role-privilege assignment endpoints.
 * All endpoints are Global namespace (G).
 */
@ApiTags('privileges-v2')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class PrivilegesV2Controller {
  constructor(private readonly privilegesService: PrivilegesV2Service) {}

  // ── Privilege CRUD (Global) ──────────────────────────────────────

  @Get('api/v1/G/privileges')
  @ApiOperation({ summary: 'List privileges (v2)', description: 'List all navigation-driven privileges.' })
  @ApiResponse({ status: 200, description: 'List of privileges returned.' })
  async findAll(): Promise<PrivilegeV2[]> {
    return this.privilegesService.findAll();
  }

  @Post('api/v1/G/privileges')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create privilege (v2)', description: 'Create a new navigation-driven privilege.' })
  @ApiResponse({ status: 201, description: 'Privilege created successfully.' })
  @ApiResponse({ status: 409, description: 'Privilege code already exists.' })
  async create(@Body() dto: CreatePrivilegeV2Dto): Promise<PrivilegeV2> {
    return this.privilegesService.create(dto);
  }

  @Get('api/v1/G/privileges/:id')
  @ApiOperation({ summary: 'Get privilege (v2)', description: 'Get a single navigation-driven privilege by ID.' })
  @ApiParam({ name: 'id', description: 'Privilege ID', example: 'PRV-A1B2' })
  @ApiResponse({ status: 200, description: 'Privilege returned.' })
  @ApiResponse({ status: 404, description: 'Privilege not found.' })
  async findOne(@Param('id') id: string): Promise<PrivilegeV2> {
    return this.privilegesService.findOne(id);
  }

  @Put('api/v1/G/privileges/:id')
  @ApiOperation({ summary: 'Update privilege (v2)', description: 'Update a navigation-driven privilege.' })
  @ApiParam({ name: 'id', description: 'Privilege ID', example: 'PRV-A1B2' })
  @ApiResponse({ status: 200, description: 'Privilege updated successfully.' })
  @ApiResponse({ status: 404, description: 'Privilege not found.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePrivilegeV2Dto,
  ): Promise<PrivilegeV2> {
    return this.privilegesService.update(id, dto);
  }

  @Delete('api/v1/G/privileges/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete privilege (v2)', description: 'Delete a navigation-driven privilege.' })
  @ApiParam({ name: 'id', description: 'Privilege ID', example: 'PRV-A1B2' })
  @ApiResponse({ status: 204, description: 'Privilege deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Privilege not found.' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.privilegesService.remove(id);
  }

  // ── Role-Privilege Assignment (Global) ────────────────────────────

  @Get('api/v1/G/roles/:roleId/privileges')
  @ApiOperation({ summary: 'List role privileges (v2)', description: 'List navigation-driven privileges assigned to a role.' })
  @ApiParam({ name: 'roleId', description: 'Role UUID or hash ID', example: 'ROL-92AF' })
  @ApiResponse({ status: 200, description: 'List of privileges returned.' })
  async findByRole(
    @Param('roleId') roleId: string,
  ): Promise<PrivilegeV2[]> {
    return this.privilegesService.findByRole(roleId);
  }

  @Post('api/v1/G/roles/:roleId/privileges')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign privileges to role (v2)', description: 'Assign navigation-driven privileges to a role.' })
  @ApiParam({ name: 'roleId', description: 'Role UUID or hash ID', example: 'ROL-92AF' })
  @ApiResponse({ status: 201, description: 'Privileges assigned successfully.' })
  async assignToRole(
    @Param('roleId') roleId: string,
    @Body() dto: AssignPrivilegeV2Dto,
  ) {
    return this.privilegesService.assignToRole(roleId, dto.privilegeIds);
  }

  @Delete('api/v1/G/roles/:roleId/privileges/:privId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke privilege from role (v2)', description: 'Revoke a navigation-driven privilege from a role.' })
  @ApiParam({ name: 'roleId', description: 'Role UUID or hash ID', example: 'ROL-92AF' })
  @ApiParam({ name: 'privId', description: 'Privilege ID', example: 'PRV-A1B2' })
  @ApiResponse({ status: 204, description: 'Privilege revoked successfully.' })
  async revokeFromRole(
    @Param('roleId') roleId: string,
    @Param('privId') privId: string,
  ): Promise<void> {
    return this.privilegesService.revokeFromRole(roleId, privId);
  }
}
