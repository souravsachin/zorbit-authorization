import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Privilege } from '../models/entities/privilege.entity';
import { RolePrivilege } from '../models/entities/role-privilege.entity';
import { Role } from '../models/entities/role.entity';
import { CreatePrivilegeDto } from '../models/dto/create-privilege.dto';
import { UpdatePrivilegeDto } from '../models/dto/update-privilege.dto';
import { HashIdService } from './hash-id.service';
import { EventPublisherService } from '../events/event-publisher.service';
import { AuthorizationEvents } from '../events/authorization.events';

@Injectable()
export class PrivilegesService {
  private readonly logger = new Logger(PrivilegesService.name);

  constructor(
    @InjectRepository(Privilege)
    private readonly privilegeRepository: Repository<Privilege>,
    @InjectRepository(RolePrivilege)
    private readonly rolePrivilegeRepository: Repository<RolePrivilege>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly hashIdService: HashIdService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  /**
   * List all privileges within an organization.
   */
  async findAllByOrganization(orgId: string): Promise<Partial<Privilege>[]> {
    const privileges = await this.privilegeRepository.find({
      where: { organizationHashId: orgId },
      order: { createdAt: 'DESC' },
    });

    return privileges.map((p) => ({
      hashId: p.hashId,
      name: p.name,
      description: p.description,
      resource: p.resource,
      action: p.action,
      organizationHashId: p.organizationHashId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  /**
   * Find a privilege by hashId, scoped to an organization.
   */
  async findOne(orgId: string, privilegeHashId: string): Promise<Partial<Privilege>> {
    const privilege = await this.privilegeRepository.findOne({
      where: { hashId: privilegeHashId, organizationHashId: orgId },
    });

    if (!privilege) {
      throw new NotFoundException(`Privilege ${privilegeHashId} not found in organization ${orgId}`);
    }

    return {
      hashId: privilege.hashId,
      name: privilege.name,
      description: privilege.description,
      resource: privilege.resource,
      action: privilege.action,
      organizationHashId: privilege.organizationHashId,
      createdAt: privilege.createdAt,
      updatedAt: privilege.updatedAt,
    };
  }

  /**
   * Create a new privilege within an organization.
   */
  async create(orgId: string, dto: CreatePrivilegeDto): Promise<Partial<Privilege>> {
    const existing = await this.privilegeRepository.findOne({
      where: { name: dto.name, organizationHashId: orgId },
    });
    if (existing) {
      throw new ConflictException(`Privilege with name '${dto.name}' already exists in organization ${orgId}`);
    }

    const hashId = this.hashIdService.generate('PRV');

    const privilege = this.privilegeRepository.create({
      hashId,
      name: dto.name,
      description: dto.description || null,
      resource: dto.resource,
      action: dto.action,
      organizationHashId: orgId,
    });

    await this.privilegeRepository.save(privilege);

    await this.eventPublisher.publish(
      AuthorizationEvents.PRIVILEGE_CREATED,
      'O',
      orgId,
      {
        privilegeHashId: privilege.hashId,
        name: privilege.name,
        resource: privilege.resource,
        action: privilege.action,
        organizationHashId: orgId,
      },
    );

    this.logger.log(`Created privilege ${privilege.hashId} (${privilege.name}) in org ${orgId}`);

    return {
      hashId: privilege.hashId,
      name: privilege.name,
      description: privilege.description,
      resource: privilege.resource,
      action: privilege.action,
      organizationHashId: privilege.organizationHashId,
      createdAt: privilege.createdAt,
    };
  }

  /**
   * Update an existing privilege within an organization.
   */
  async update(orgId: string, privilegeHashId: string, dto: UpdatePrivilegeDto): Promise<Partial<Privilege>> {
    const privilege = await this.privilegeRepository.findOne({
      where: { hashId: privilegeHashId, organizationHashId: orgId },
    });

    if (!privilege) {
      throw new NotFoundException(`Privilege ${privilegeHashId} not found in organization ${orgId}`);
    }

    if (dto.name !== undefined) privilege.name = dto.name;
    if (dto.description !== undefined) privilege.description = dto.description;
    if (dto.resource !== undefined) privilege.resource = dto.resource;
    if (dto.action !== undefined) privilege.action = dto.action;

    await this.privilegeRepository.save(privilege);

    await this.eventPublisher.publish(
      AuthorizationEvents.PRIVILEGE_UPDATED,
      'O',
      orgId,
      {
        privilegeHashId: privilege.hashId,
        updatedFields: Object.keys(dto).filter(
          (k) => dto[k as keyof UpdatePrivilegeDto] !== undefined,
        ),
      },
    );

    this.logger.log(`Updated privilege ${privilegeHashId} in org ${orgId}`);

    return {
      hashId: privilege.hashId,
      name: privilege.name,
      description: privilege.description,
      resource: privilege.resource,
      action: privilege.action,
      organizationHashId: privilege.organizationHashId,
      updatedAt: privilege.updatedAt,
    };
  }

  /**
   * Soft-delete a privilege within an organization.
   */
  async remove(orgId: string, privilegeHashId: string): Promise<void> {
    const privilege = await this.privilegeRepository.findOne({
      where: { hashId: privilegeHashId, organizationHashId: orgId },
    });

    if (!privilege) {
      throw new NotFoundException(`Privilege ${privilegeHashId} not found in organization ${orgId}`);
    }

    await this.privilegeRepository.softRemove(privilege);

    await this.eventPublisher.publish(
      AuthorizationEvents.PRIVILEGE_DELETED,
      'O',
      orgId,
      { privilegeHashId },
    );

    this.logger.log(`Soft-deleted privilege ${privilegeHashId} from org ${orgId}`);
  }

  /**
   * Assign multiple privileges to a role within an organization.
   */
  async assignToRole(
    orgId: string,
    roleHashId: string,
    privilegeHashIds: string[],
  ): Promise<{ roleHashId: string; privilegeHashIds: string[]; assignedAt: Date }[]> {
    const role = await this.roleRepository.findOne({
      where: { hashId: roleHashId, organizationHashId: orgId },
    });
    if (!role) {
      throw new NotFoundException(`Role ${roleHashId} not found in organization ${orgId}`);
    }

    const privileges = await this.privilegeRepository.find({
      where: { hashId: In(privilegeHashIds), organizationHashId: orgId },
    });

    const foundHashIds = privileges.map((p) => p.hashId);
    const missing = privilegeHashIds.filter((id) => !foundHashIds.includes(id));
    if (missing.length > 0) {
      throw new NotFoundException(`Privileges not found in organization ${orgId}: ${missing.join(', ')}`);
    }

    const results: { roleHashId: string; privilegeHashIds: string[]; assignedAt: Date }[] = [];

    for (const privilege of privileges) {
      const existing = await this.rolePrivilegeRepository.findOne({
        where: { roleId: role.id, privilegeId: privilege.id },
      });
      if (existing) {
        continue; // Skip already assigned
      }

      const rolePrivilege = this.rolePrivilegeRepository.create({
        roleId: role.id,
        privilegeId: privilege.id,
      });

      await this.rolePrivilegeRepository.save(rolePrivilege);

      results.push({
        roleHashId,
        privilegeHashIds: [privilege.hashId],
        assignedAt: rolePrivilege.assignedAt,
      });
    }

    await this.eventPublisher.publish(
      AuthorizationEvents.PRIVILEGE_ASSIGNED,
      'O',
      orgId,
      {
        roleHashId,
        privilegeHashIds: foundHashIds,
      },
    );

    this.logger.log(`Assigned ${results.length} privileges to role ${roleHashId} in org ${orgId}`);

    return results;
  }

  /**
   * Revoke a privilege from a role within an organization.
   */
  async revokeFromRole(
    orgId: string,
    roleHashId: string,
    privilegeHashId: string,
  ): Promise<void> {
    const role = await this.roleRepository.findOne({
      where: { hashId: roleHashId, organizationHashId: orgId },
    });
    if (!role) {
      throw new NotFoundException(`Role ${roleHashId} not found in organization ${orgId}`);
    }

    const privilege = await this.privilegeRepository.findOne({
      where: { hashId: privilegeHashId, organizationHashId: orgId },
    });
    if (!privilege) {
      throw new NotFoundException(`Privilege ${privilegeHashId} not found in organization ${orgId}`);
    }

    const rolePrivilege = await this.rolePrivilegeRepository.findOne({
      where: { roleId: role.id, privilegeId: privilege.id },
    });
    if (!rolePrivilege) {
      throw new NotFoundException(
        `Privilege ${privilegeHashId} is not assigned to role ${roleHashId}`,
      );
    }

    await this.rolePrivilegeRepository.remove(rolePrivilege);

    await this.eventPublisher.publish(
      AuthorizationEvents.PRIVILEGE_REVOKED,
      'O',
      orgId,
      {
        roleHashId,
        privilegeHashId,
      },
    );

    this.logger.log(`Revoked privilege ${privilegeHashId} from role ${roleHashId} in org ${orgId}`);
  }

  /**
   * List privileges assigned to a specific role.
   */
  async findByRole(orgId: string, roleHashId: string): Promise<Partial<Privilege>[]> {
    const role = await this.roleRepository.findOne({
      where: { hashId: roleHashId, organizationHashId: orgId },
    });
    if (!role) {
      throw new NotFoundException(`Role ${roleHashId} not found in organization ${orgId}`);
    }

    const rolePrivileges = await this.rolePrivilegeRepository.find({
      where: { roleId: role.id },
      relations: ['privilege'],
    });

    return rolePrivileges.map((rp) => ({
      hashId: rp.privilege.hashId,
      name: rp.privilege.name,
      description: rp.privilege.description,
      resource: rp.privilege.resource,
      action: rp.privilege.action,
      organizationHashId: rp.privilege.organizationHashId,
      createdAt: rp.privilege.createdAt,
    }));
  }
}
