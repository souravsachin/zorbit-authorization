import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Privilege } from '../models/entities/privilege.entity';
import { RolePrivilege } from '../models/entities/role-privilege.entity';
import { Role } from '../models/entities/role.entity';
import { CreatePrivilegeDto } from '../models/dto/create-privilege.dto';
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
   * List all privileges registered in the platform.
   */
  async findAll(): Promise<Partial<Privilege>[]> {
    const privileges = await this.privilegeRepository.find({
      order: { code: 'ASC' },
    });

    return privileges.map((p) => ({
      hashId: p.hashId,
      code: p.code,
      description: p.description,
      namespaceScope: p.namespaceScope,
      createdAt: p.createdAt,
    }));
  }

  /**
   * Find a privilege by hashId.
   */
  async findOne(privilegeHashId: string): Promise<Partial<Privilege>> {
    const privilege = await this.privilegeRepository.findOne({
      where: { hashId: privilegeHashId },
    });

    if (!privilege) {
      throw new NotFoundException(`Privilege ${privilegeHashId} not found`);
    }

    return {
      hashId: privilege.hashId,
      code: privilege.code,
      description: privilege.description,
      namespaceScope: privilege.namespaceScope,
      createdAt: privilege.createdAt,
    };
  }

  /**
   * Create a new privilege definition.
   */
  async create(dto: CreatePrivilegeDto): Promise<Partial<Privilege>> {
    const existing = await this.privilegeRepository.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Privilege with code '${dto.code}' already exists`);
    }

    const hashId = this.hashIdService.generate('PRV');

    const privilege = this.privilegeRepository.create({
      hashId,
      code: dto.code,
      description: dto.description || null,
      namespaceScope: dto.namespaceScope,
    });

    await this.privilegeRepository.save(privilege);

    this.logger.log(`Created privilege ${privilege.hashId} (${privilege.code})`);

    return {
      hashId: privilege.hashId,
      code: privilege.code,
      description: privilege.description,
      namespaceScope: privilege.namespaceScope,
      createdAt: privilege.createdAt,
    };
  }

  /**
   * Assign a privilege to a role within an organization.
   */
  async assignToRole(
    orgId: string,
    roleHashId: string,
    privilegeHashId: string,
  ): Promise<{ roleHashId: string; privilegeHashId: string; assignedAt: Date }> {
    // Verify role exists and belongs to org
    const role = await this.roleRepository.findOne({
      where: { hashId: roleHashId, organizationHashId: orgId },
    });
    if (!role) {
      throw new NotFoundException(`Role ${roleHashId} not found in organization ${orgId}`);
    }

    // Verify privilege exists
    const privilege = await this.privilegeRepository.findOne({
      where: { hashId: privilegeHashId },
    });
    if (!privilege) {
      throw new NotFoundException(`Privilege ${privilegeHashId} not found`);
    }

    // Check for duplicate assignment
    const existing = await this.rolePrivilegeRepository.findOne({
      where: { roleId: role.id, privilegeId: privilege.id },
    });
    if (existing) {
      throw new ConflictException(
        `Privilege ${privilegeHashId} already assigned to role ${roleHashId}`,
      );
    }

    const rolePrivilege = this.rolePrivilegeRepository.create({
      roleId: role.id,
      privilegeId: privilege.id,
    });

    await this.rolePrivilegeRepository.save(rolePrivilege);

    await this.eventPublisher.publish(
      AuthorizationEvents.PRIVILEGE_ASSIGNED,
      'O',
      orgId,
      {
        roleHashId,
        privilegeHashId,
        privilegeCode: privilege.code,
      },
    );

    this.logger.log(`Assigned privilege ${privilegeHashId} to role ${roleHashId} in org ${orgId}`);

    return {
      roleHashId,
      privilegeHashId,
      assignedAt: rolePrivilege.assignedAt,
    };
  }

  /**
   * Revoke a privilege from a role within an organization.
   */
  async revokeFromRole(
    orgId: string,
    roleHashId: string,
    privilegeHashId: string,
  ): Promise<void> {
    // Verify role exists and belongs to org
    const role = await this.roleRepository.findOne({
      where: { hashId: roleHashId, organizationHashId: orgId },
    });
    if (!role) {
      throw new NotFoundException(`Role ${roleHashId} not found in organization ${orgId}`);
    }

    // Verify privilege exists
    const privilege = await this.privilegeRepository.findOne({
      where: { hashId: privilegeHashId },
    });
    if (!privilege) {
      throw new NotFoundException(`Privilege ${privilegeHashId} not found`);
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
        privilegeCode: privilege.code,
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
      code: rp.privilege.code,
      description: rp.privilege.description,
      namespaceScope: rp.privilege.namespaceScope,
      createdAt: rp.privilege.createdAt,
    }));
  }
}
