import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserRole } from '../models/entities/user-role.entity';
import { Role } from '../models/entities/role.entity';
import { RolePrivilegeV2 } from '../models/entities/role-privilege-v2.entity';
import { PrivilegeV2 } from '../models/entities/privilege-v2.entity';

@Injectable()
export class UserRolesService {
  private readonly logger = new Logger(UserRolesService.name);

  constructor(
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(RolePrivilegeV2)
    private readonly rolePrivilegeV2Repository: Repository<RolePrivilegeV2>,
    @InjectRepository(PrivilegeV2)
    private readonly privilegeV2Repository: Repository<PrivilegeV2>,
  ) {}

  /**
   * Assign a role to a user within an organization.
   */
  async assignRole(
    orgId: string,
    userHashId: string,
    roleHashId: string,
  ): Promise<{ userHashId: string; roleHashId: string; assignedAt: Date }> {
    // Verify role exists and belongs to org
    const role = await this.roleRepository.findOne({
      where: { hashId: roleHashId, organizationHashId: orgId },
    });
    if (!role) {
      throw new NotFoundException(`Role ${roleHashId} not found in organization ${orgId}`);
    }

    // Check for duplicate assignment
    const existing = await this.userRoleRepository.findOne({
      where: { userHashId, roleHashId, organizationHashId: orgId },
    });
    if (existing) {
      throw new ConflictException(
        `User ${userHashId} already has role ${roleHashId} in organization ${orgId}`,
      );
    }

    const userRole = this.userRoleRepository.create({
      userHashId,
      roleHashId,
      organizationHashId: orgId,
    });

    await this.userRoleRepository.save(userRole);

    this.logger.log(`Assigned role ${roleHashId} to user ${userHashId} in org ${orgId}`);

    return {
      userHashId,
      roleHashId,
      assignedAt: userRole.assignedAt,
    };
  }

  /**
   * Remove a role from a user within an organization.
   */
  async removeRole(
    orgId: string,
    userHashId: string,
    roleHashId: string,
  ): Promise<void> {
    const userRole = await this.userRoleRepository.findOne({
      where: { userHashId, roleHashId, organizationHashId: orgId },
    });

    if (!userRole) {
      throw new NotFoundException(
        `User ${userHashId} does not have role ${roleHashId} in organization ${orgId}`,
      );
    }

    await this.userRoleRepository.remove(userRole);

    this.logger.log(`Removed role ${roleHashId} from user ${userHashId} in org ${orgId}`);
  }

  /**
   * List all roles assigned to a user within an organization.
   */
  async findRolesForUser(
    orgId: string,
    userHashId: string,
  ): Promise<{ roleHashId: string; roleName: string; assignedAt: Date }[]> {
    const userRoles = await this.userRoleRepository.find({
      where: { userHashId, organizationHashId: orgId },
    });

    const results: { roleHashId: string; roleName: string; assignedAt: Date }[] = [];

    for (const ur of userRoles) {
      const role = await this.roleRepository.findOne({
        where: { hashId: ur.roleHashId, organizationHashId: orgId },
      });
      if (role) {
        results.push({
          roleHashId: ur.roleHashId,
          roleName: role.name,
          assignedAt: ur.assignedAt,
        });
      }
    }

    return results;
  }

  /**
   * Get all role hash IDs for a user in an organization.
   * Used by PolicyService for authorization checks.
   */
  async getRoleHashIdsForUser(orgId: string, userHashId: string): Promise<string[]> {
    const userRoles = await this.userRoleRepository.find({
      where: { userHashId, organizationHashId: orgId },
    });
    return userRoles.map((ur) => ur.roleHashId);
  }

  /**
   * Get all privilege codes (v2 navigation-driven) for a user in an organization.
   * Resolves: user -> roles -> role_privileges_v2 -> privilege_v2.privilegeCode
   * Used by the navigation service to filter menu items.
   */
  async getPrivilegeCodesForUser(orgId: string, userHashId: string): Promise<string[]> {
    // Get user's roles in this org
    const userRoles = await this.userRoleRepository.find({
      where: { userHashId, organizationHashId: orgId },
    });

    if (userRoles.length === 0) {
      return [];
    }

    // Resolve role hashIds to role UUIDs
    const roleHashIds = userRoles.map((ur) => ur.roleHashId);
    const roles = await this.roleRepository.find({
      where: { hashId: In(roleHashIds), organizationHashId: orgId },
    });

    if (roles.length === 0) {
      return [];
    }

    const roleUuids = roles.map((r) => r.id);

    // Get all v2 privilege assignments for these roles
    const rolePrivileges = await this.rolePrivilegeV2Repository.find({
      where: { roleId: In(roleUuids) },
      relations: ['privilege'],
    });

    // Collect unique privilege codes
    const codes = new Set<string>();
    for (const rp of rolePrivileges) {
      if (rp.privilege?.privilegeCode) {
        codes.add(rp.privilege.privilegeCode);
      }
    }

    return Array.from(codes);
  }
}
