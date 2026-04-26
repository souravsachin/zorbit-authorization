import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, RoleStatus } from '../models/entities/role.entity';
import { CreateRoleDto } from '../models/dto/create-role.dto';
import { UpdateRoleDto } from '../models/dto/update-role.dto';
import { HashIdService } from './hash-id.service';
import { EventPublisherService } from '../events/event-publisher.service';
import { AuthorizationEvents } from '../events/authorization.events';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly hashIdService: HashIdService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  /**
   * List all roles within a given organization.
   * Enforces namespace isolation: only returns roles matching orgId.
   */
  async findAllByOrganization(orgId: string): Promise<Partial<Role>[]> {
    const roles = await this.roleRepository.find({
      where: { organizationHashId: orgId },
      order: { createdAt: 'DESC' },
    });

    return roles.map((r) => ({
      hashId: r.hashId,
      name: r.name,
      description: r.description,
      organizationHashId: r.organizationHashId,
      isSystem: r.isSystem,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  /**
   * Count roles in an organization.
   *
   * Cycle-105 E-OVERFETCH (MSG-082): Roles page count badges
   * fetched the full role list (~N rows) just to read `length`.
   * Returns `{count}` only — ~30 bytes vs full payload.
   */
  async countByOrganization(orgId: string): Promise<{ count: number }> {
    const count = await this.roleRepository.count({
      where: { organizationHashId: orgId },
    });
    return { count };
  }

  /**
   * Find a single role by hashId, scoped to a specific organization.
   */
  async findOne(orgId: string, roleHashId: string): Promise<Partial<Role>> {
    const role = await this.roleRepository.findOne({
      where: { hashId: roleHashId, organizationHashId: orgId },
    });

    if (!role) {
      throw new NotFoundException(`Role ${roleHashId} not found in organization ${orgId}`);
    }

    return {
      hashId: role.hashId,
      name: role.name,
      description: role.description,
      organizationHashId: role.organizationHashId,
      isSystem: role.isSystem,
      status: role.status,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  /**
   * Create a new role within an organization.
   */
  // Reserved role names — prevent privilege escalation via role naming
  private static readonly RESERVED_ROLE_NAMES = [
    'superadmin', 'super', 'sysadmin', 'system', 'root', 'platform_admin',
  ];

  async create(orgId: string, dto: CreateRoleDto): Promise<Partial<Role>> {
    // Block reserved role names
    const normalizedName = (dto.name || '').toLowerCase().trim();
    if (RolesService.RESERVED_ROLE_NAMES.includes(normalizedName)) {
      throw new ConflictException(`Role name '${dto.name}' is reserved and cannot be created`);
    }

    // Check for duplicate name within the org
    const existing = await this.roleRepository.findOne({
      where: { name: dto.name, organizationHashId: orgId },
    });
    if (existing) {
      throw new ConflictException(`Role with name '${dto.name}' already exists in organization ${orgId}`);
    }

    const hashId = this.hashIdService.generate('ROL');

    const role = this.roleRepository.create({
      hashId,
      name: dto.name,
      description: dto.description || null,
      organizationHashId: orgId,
      isSystem: dto.isSystem || false,
    });

    await this.roleRepository.save(role);

    await this.eventPublisher.publish(
      AuthorizationEvents.ROLE_CREATED,
      'O',
      orgId,
      {
        roleHashId: role.hashId,
        name: role.name,
        organizationHashId: orgId,
      },
    );

    this.logger.log(`Created role ${role.hashId} (${role.name}) in org ${orgId}`);

    return {
      hashId: role.hashId,
      name: role.name,
      description: role.description,
      organizationHashId: role.organizationHashId,
      isSystem: role.isSystem,
      status: role.status,
      createdAt: role.createdAt,
    };
  }

  /**
   * Update an existing role within an organization.
   * System roles cannot be modified.
   */
  async update(orgId: string, roleHashId: string, dto: UpdateRoleDto): Promise<Partial<Role>> {
    const role = await this.roleRepository.findOne({
      where: { hashId: roleHashId, organizationHashId: orgId },
    });

    if (!role) {
      throw new NotFoundException(`Role ${roleHashId} not found in organization ${orgId}`);
    }

    if (role.isSystem) {
      throw new ForbiddenException(`System role ${roleHashId} cannot be modified`);
    }

    // Block renaming to reserved role names
    if (dto.name !== undefined) {
      const normalizedName = dto.name.toLowerCase().trim();
      if (RolesService.RESERVED_ROLE_NAMES.includes(normalizedName)) {
        throw new ConflictException(`Role name '${dto.name}' is reserved`);
      }
      role.name = dto.name;
    }
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.status !== undefined) role.status = dto.status;

    await this.roleRepository.save(role);

    await this.eventPublisher.publish(
      AuthorizationEvents.ROLE_UPDATED,
      'O',
      orgId,
      {
        roleHashId: role.hashId,
        updatedFields: Object.keys(dto).filter(
          (k) => dto[k as keyof UpdateRoleDto] !== undefined,
        ),
      },
    );

    return {
      hashId: role.hashId,
      name: role.name,
      description: role.description,
      organizationHashId: role.organizationHashId,
      isSystem: role.isSystem,
      status: role.status,
      updatedAt: role.updatedAt,
    };
  }

  /**
   * Delete a role within an organization.
   * System roles cannot be deleted.
   */
  async remove(orgId: string, roleHashId: string): Promise<void> {
    const role = await this.roleRepository.findOne({
      where: { hashId: roleHashId, organizationHashId: orgId },
    });

    if (!role) {
      throw new NotFoundException(`Role ${roleHashId} not found in organization ${orgId}`);
    }

    if (role.isSystem) {
      throw new ForbiddenException(`System role ${roleHashId} cannot be deleted`);
    }

    await this.roleRepository.remove(role);

    await this.eventPublisher.publish(
      AuthorizationEvents.ROLE_DELETED,
      'O',
      orgId,
      { roleHashId },
    );

    this.logger.log(`Deleted role ${roleHashId} from org ${orgId}`);
  }

  /**
   * Find a role entity by hashId (internal use, returns full entity).
   */
  async findEntityByHashId(orgId: string, roleHashId: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { hashId: roleHashId, organizationHashId: orgId },
    });

    if (!role) {
      throw new NotFoundException(`Role ${roleHashId} not found in organization ${orgId}`);
    }

    return role;
  }
}
