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

/**
 * User-role assignment endpoints, scoped to an organization namespace.
 */
@ApiTags('user-roles')
@ApiBearerAuth()
@Controller('api/v1/O/:orgId/users/:userId/roles')
@UseGuards(JwtAuthGuard, NamespaceGuard)
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  @Get()
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
