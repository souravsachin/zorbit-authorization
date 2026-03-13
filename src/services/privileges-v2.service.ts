import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PrivilegeV2 } from '../models/entities/privilege-v2.entity';
import { PrivilegeSection } from '../models/entities/privilege-section.entity';
import { RolePrivilegeV2 } from '../models/entities/role-privilege-v2.entity';
import { Role } from '../models/entities/role.entity';
import { CreatePrivilegeV2Dto } from '../models/dto/create-privilege-v2.dto';
import { UpdatePrivilegeV2Dto } from '../models/dto/update-privilege-v2.dto';
import { EventPublisherService } from '../events/event-publisher.service';
import { AuthorizationEvents } from '../events/authorization.events';

@Injectable()
export class PrivilegesV2Service {
  private readonly logger = new Logger(PrivilegesV2Service.name);

  constructor(
    @InjectRepository(PrivilegeV2)
    private readonly privilegeRepository: Repository<PrivilegeV2>,
    @InjectRepository(PrivilegeSection)
    private readonly sectionRepository: Repository<PrivilegeSection>,
    @InjectRepository(RolePrivilegeV2)
    private readonly rolePrivilegeRepository: Repository<RolePrivilegeV2>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  /**
   * List all privileges, ordered by section then seq_number.
   */
  async findAll(): Promise<PrivilegeV2[]> {
    return this.privilegeRepository.find({
      relations: ['section'],
      order: { sectionId: 'ASC', seqNumber: 'ASC' },
    });
  }

  /**
   * Find a single privilege by ID.
   */
  async findOne(id: string): Promise<PrivilegeV2> {
    const privilege = await this.privilegeRepository.findOne({
      where: { id },
      relations: ['section'],
    });
    if (!privilege) {
      throw new NotFoundException(`Privilege ${id} not found`);
    }
    return privilege;
  }

  /**
   * Create a new privilege.
   */
  async create(dto: CreatePrivilegeV2Dto): Promise<PrivilegeV2> {
    // Validate section exists
    const section = await this.sectionRepository.findOne({
      where: { id: dto.sectionId },
    });
    if (!section) {
      throw new NotFoundException(
        `Privilege section ${dto.sectionId} not found`,
      );
    }

    // Check for duplicate privilege_code
    const existing = await this.privilegeRepository.findOne({
      where: { privilegeCode: dto.privilegeCode },
    });
    if (existing) {
      throw new ConflictException(
        `Privilege with code '${dto.privilegeCode}' already exists`,
      );
    }

    const privilege = this.privilegeRepository.create({
      privilegeCode: dto.privilegeCode,
      privilegeLabel: dto.privilegeLabel,
      sectionId: dto.sectionId,
      feRouteConfig: dto.feRouteConfig || null,
      beRouteConfig: dto.beRouteConfig || null,
      icon: dto.icon || null,
      visibleInMenu: dto.visibleInMenu ?? true,
      seqNumber: dto.seqNumber ?? 0,
    });

    await this.privilegeRepository.save(privilege);

    // Reload with section relation
    const saved = await this.privilegeRepository.findOne({
      where: { id: privilege.id },
      relations: ['section'],
    });

    await this.eventPublisher.publish(
      AuthorizationEvents.PRIVILEGE_V2_CREATED,
      'G',
      'G',
      {
        privilegeId: privilege.id,
        privilegeCode: privilege.privilegeCode,
        sectionId: privilege.sectionId,
      },
    );

    this.logger.log(
      `Created privilege ${privilege.id} (${privilege.privilegeCode})`,
    );

    return saved!;
  }

  /**
   * Update an existing privilege.
   */
  async update(id: string, dto: UpdatePrivilegeV2Dto): Promise<PrivilegeV2> {
    const privilege = await this.privilegeRepository.findOne({
      where: { id },
    });
    if (!privilege) {
      throw new NotFoundException(`Privilege ${id} not found`);
    }

    // Validate section if changing
    if (dto.sectionId !== undefined && dto.sectionId !== privilege.sectionId) {
      const section = await this.sectionRepository.findOne({
        where: { id: dto.sectionId },
      });
      if (!section) {
        throw new NotFoundException(
          `Privilege section ${dto.sectionId} not found`,
        );
      }
    }

    // Check for duplicate privilege_code if changing
    if (
      dto.privilegeCode !== undefined &&
      dto.privilegeCode !== privilege.privilegeCode
    ) {
      const existing = await this.privilegeRepository.findOne({
        where: { privilegeCode: dto.privilegeCode },
      });
      if (existing) {
        throw new ConflictException(
          `Privilege with code '${dto.privilegeCode}' already exists`,
        );
      }
    }

    if (dto.privilegeCode !== undefined) privilege.privilegeCode = dto.privilegeCode;
    if (dto.privilegeLabel !== undefined) privilege.privilegeLabel = dto.privilegeLabel;
    if (dto.sectionId !== undefined) privilege.sectionId = dto.sectionId;
    if (dto.feRouteConfig !== undefined) privilege.feRouteConfig = dto.feRouteConfig;
    if (dto.beRouteConfig !== undefined) privilege.beRouteConfig = dto.beRouteConfig;
    if (dto.icon !== undefined) privilege.icon = dto.icon;
    if (dto.visibleInMenu !== undefined) privilege.visibleInMenu = dto.visibleInMenu;
    if (dto.seqNumber !== undefined) privilege.seqNumber = dto.seqNumber;

    await this.privilegeRepository.save(privilege);

    const updated = await this.privilegeRepository.findOne({
      where: { id },
      relations: ['section'],
    });

    await this.eventPublisher.publish(
      AuthorizationEvents.PRIVILEGE_V2_UPDATED,
      'G',
      'G',
      {
        privilegeId: id,
        updatedFields: Object.keys(dto).filter(
          (k) => dto[k as keyof UpdatePrivilegeV2Dto] !== undefined,
        ),
      },
    );

    this.logger.log(`Updated privilege ${id}`);

    return updated!;
  }

  /**
   * Delete a privilege.
   */
  async remove(id: string): Promise<void> {
    const privilege = await this.privilegeRepository.findOne({
      where: { id },
    });
    if (!privilege) {
      throw new NotFoundException(`Privilege ${id} not found`);
    }

    await this.privilegeRepository.remove(privilege);

    await this.eventPublisher.publish(
      AuthorizationEvents.PRIVILEGE_V2_DELETED,
      'G',
      'G',
      { privilegeId: id, privilegeCode: privilege.privilegeCode },
    );

    this.logger.log(`Deleted privilege ${id}`);
  }

  // ── Role-Privilege Assignment ───────────────────────────────────

  /**
   * List privileges assigned to a role (by role UUID).
   */
  async findByRole(roleId: string): Promise<PrivilegeV2[]> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
    });
    if (!role) {
      // Also try hashId lookup
      const roleByHash = await this.roleRepository.findOne({
        where: { hashId: roleId },
      });
      if (!roleByHash) {
        throw new NotFoundException(`Role ${roleId} not found`);
      }
      return this.findByRoleUuid(roleByHash.id);
    }
    return this.findByRoleUuid(role.id);
  }

  private async findByRoleUuid(roleUuid: string): Promise<PrivilegeV2[]> {
    const rolePrivileges = await this.rolePrivilegeRepository.find({
      where: { roleId: roleUuid },
      relations: ['privilege', 'privilege.section'],
    });

    return rolePrivileges.map((rp) => rp.privilege);
  }

  /**
   * Assign multiple privileges to a role.
   */
  async assignToRole(
    roleId: string,
    privilegeIds: string[],
  ): Promise<{ roleId: string; assigned: string[]; skipped: string[] }> {
    // Resolve role — try UUID first, then hashId
    let role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      role = await this.roleRepository.findOne({ where: { hashId: roleId } });
    }
    if (!role) {
      throw new NotFoundException(`Role ${roleId} not found`);
    }

    // Validate all privileges exist
    const privileges = await this.privilegeRepository.find({
      where: { id: In(privilegeIds) },
    });
    const foundIds = privileges.map((p) => p.id);
    const missing = privilegeIds.filter((id) => !foundIds.includes(id));
    if (missing.length > 0) {
      throw new NotFoundException(`Privileges not found: ${missing.join(', ')}`);
    }

    const assigned: string[] = [];
    const skipped: string[] = [];

    for (const privilege of privileges) {
      const existing = await this.rolePrivilegeRepository.findOne({
        where: { roleId: role.id, privilegeId: privilege.id },
      });
      if (existing) {
        skipped.push(privilege.id);
        continue;
      }

      const rp = this.rolePrivilegeRepository.create({
        roleId: role.id,
        privilegeId: privilege.id,
      });
      await this.rolePrivilegeRepository.save(rp);
      assigned.push(privilege.id);
    }

    await this.eventPublisher.publish(
      AuthorizationEvents.ROLE_PRIVILEGE_V2_ASSIGNED,
      'G',
      'G',
      {
        roleId: role.hashId,
        assigned,
        skipped,
      },
    );

    this.logger.log(
      `Assigned ${assigned.length} privileges to role ${role.hashId} (skipped ${skipped.length})`,
    );

    return { roleId: role.hashId, assigned, skipped };
  }

  /**
   * Revoke a privilege from a role.
   */
  async revokeFromRole(roleId: string, privilegeId: string): Promise<void> {
    // Resolve role
    let role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      role = await this.roleRepository.findOne({ where: { hashId: roleId } });
    }
    if (!role) {
      throw new NotFoundException(`Role ${roleId} not found`);
    }

    const rp = await this.rolePrivilegeRepository.findOne({
      where: { roleId: role.id, privilegeId },
    });
    if (!rp) {
      throw new NotFoundException(
        `Privilege ${privilegeId} is not assigned to role ${roleId}`,
      );
    }

    await this.rolePrivilegeRepository.remove(rp);

    await this.eventPublisher.publish(
      AuthorizationEvents.ROLE_PRIVILEGE_V2_REVOKED,
      'G',
      'G',
      {
        roleId: role.hashId,
        privilegeId,
      },
    );

    this.logger.log(
      `Revoked privilege ${privilegeId} from role ${role.hashId}`,
    );
  }
}
