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
import { PrivilegeSectionsService } from '../services/privilege-sections.service';
import { CreatePrivilegeSectionDto } from '../models/dto/create-privilege-section.dto';
import { UpdatePrivilegeSectionDto } from '../models/dto/update-privilege-section.dto';
import { AssignSectionPrivilegesDto } from '../models/dto/assign-section-privileges.dto';
import { JwtAuthGuard } from '../middleware/jwt-auth.guard';
import { ZorbitPrivilegeGuard } from '../middleware/zorbit-privilege.guard';
import { RequirePrivileges } from '../middleware/decorators';
import { PrivilegeSection } from '../models/entities/privilege-section.entity';
import { PrivilegeV2 } from '../models/entities/privilege-v2.entity';

/**
 * Privilege section CRUD endpoints (Global namespace).
 * Sections represent menu groupings for navigation.
 */
@ApiTags('privilege-sections')
@ApiBearerAuth()
@Controller('api/v1/G/sections')
@UseGuards(JwtAuthGuard, ZorbitPrivilegeGuard)
@RequirePrivileges('authorization.privilege.read')
export class PrivilegeSectionsController {
  constructor(
    private readonly sectionsService: PrivilegeSectionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List privilege sections', description: 'List all privilege sections ordered by seq_number.' })
  @ApiResponse({ status: 200, description: 'List of privilege sections returned.' })
  async findAll(): Promise<PrivilegeSection[]> {
    return this.sectionsService.findAll();
  }

  @Post()
  @RequirePrivileges('authorization.privilege.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create privilege section', description: 'Create a new privilege section.' })
  @ApiResponse({ status: 201, description: 'Privilege section created successfully.' })
  @ApiResponse({ status: 409, description: 'Section code already exists.' })
  async create(
    @Body() dto: CreatePrivilegeSectionDto,
  ): Promise<PrivilegeSection> {
    return this.sectionsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get privilege section', description: 'Get a single privilege section by ID.' })
  @ApiParam({ name: 'id', description: 'Section ID', example: 'SEC-A1B2' })
  @ApiResponse({ status: 200, description: 'Privilege section returned.' })
  @ApiResponse({ status: 404, description: 'Section not found.' })
  async findOne(@Param('id') id: string): Promise<PrivilegeSection> {
    return this.sectionsService.findOne(id);
  }

  @Put(':id')
  @RequirePrivileges('authorization.privilege.update')
  @ApiOperation({ summary: 'Update privilege section', description: 'Update a privilege section.' })
  @ApiParam({ name: 'id', description: 'Section ID', example: 'SEC-A1B2' })
  @ApiResponse({ status: 200, description: 'Privilege section updated successfully.' })
  @ApiResponse({ status: 404, description: 'Section not found.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePrivilegeSectionDto,
  ): Promise<PrivilegeSection> {
    return this.sectionsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePrivileges('authorization.privilege.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete privilege section', description: 'Delete a privilege section.' })
  @ApiParam({ name: 'id', description: 'Section ID', example: 'SEC-A1B2' })
  @ApiResponse({ status: 204, description: 'Privilege section deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Section not found.' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.sectionsService.remove(id);
  }

  @Post(':id/privileges')
  @RequirePrivileges('authorization.privilege.assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign privileges to section', description: 'Assign one or more privileges to a section by updating their sectionId.' })
  @ApiParam({ name: 'id', description: 'Section ID', example: 'SEC-A1B2' })
  @ApiResponse({ status: 200, description: 'Privileges assigned to section.' })
  @ApiResponse({ status: 404, description: 'Section not found.' })
  async assignPrivileges(
    @Param('id') id: string,
    @Body() dto: AssignSectionPrivilegesDto,
  ) {
    return this.sectionsService.assignPrivileges(id, dto.privilegeIds);
  }

  @Get(':id/privileges')
  @ApiOperation({ summary: 'List privileges in section', description: 'List all privileges belonging to a section.' })
  @ApiParam({ name: 'id', description: 'Section ID', example: 'SEC-A1B2' })
  @ApiResponse({ status: 200, description: 'List of privileges in section.' })
  @ApiResponse({ status: 404, description: 'Section not found.' })
  async findPrivileges(@Param('id') id: string): Promise<PrivilegeV2[]> {
    return this.sectionsService.findPrivilegesBySection(id);
  }
}
