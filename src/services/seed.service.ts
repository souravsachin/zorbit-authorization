import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { randomBytes } from 'crypto';
import { Role, RoleStatus } from '../models/entities/role.entity';
import { Privilege } from '../models/entities/privilege.entity';
import { RolePrivilege } from '../models/entities/role-privilege.entity';
import { UserRole } from '../models/entities/user-role.entity';

function genHashId(prefix: string): string {
  return `${prefix}-${randomBytes(2).toString('hex').toUpperCase()}`;
}

interface RoleDef {
  hashId: string;
  name: string;
  description: string;
  organizationHashId: string;
  isSystem: boolean;
}

interface PrivilegeDef {
  hashId: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  organizationHashId: string;
}

// 15 standard platform roles seeded under global platform org O-OZPY
const SYSTEM_ROLES: RoleDef[] = [
  { hashId: 'ROL-SYS1', name: 'superadmin',         description: 'Full platform access',                     organizationHashId: 'O-OZPY', isSystem: true },
  { hashId: 'ROL-SYS2', name: 'platform_admin',     description: 'Platform administration',                  organizationHashId: 'O-OZPY', isSystem: true },
  { hashId: 'ROL-SYS3', name: 'org_admin',          description: 'Full organization administration',         organizationHashId: 'O-OZPY', isSystem: true },
  { hashId: 'ROL-SYS4', name: 'org_member',         description: 'Standard organization member',             organizationHashId: 'O-OZPY', isSystem: true },
  { hashId: 'ROL-SYS5', name: 'org_viewer',         description: 'Read-only access to organization data',    organizationHashId: 'O-OZPY', isSystem: true },
  { hashId: 'ROL-SYS6', name: 'billing_admin',      description: 'Manage billing and subscriptions',         organizationHashId: 'O-OZPY', isSystem: true },
  { hashId: 'ROL-SYS7', name: 'audit_viewer',       description: 'Read audit logs',                          organizationHashId: 'O-OZPY', isSystem: true },
  { hashId: 'ROL-SYS8', name: 'identity_admin',     description: 'Manage users and authentication',          organizationHashId: 'O-OZPY', isSystem: true },
  { hashId: 'ROL-SYS9', name: 'report_viewer',      description: 'View reports and analytics',               organizationHashId: 'O-OZPY', isSystem: true },
  { hashId: 'ROL-S10',  name: 'underwriter',        description: 'Underwriting operations access',           organizationHashId: 'O-OZPY', isSystem: true },
  { hashId: 'ROL-S11',  name: 'claims_handler',     description: 'Claims processing access',                 organizationHashId: 'O-OZPY', isSystem: true },
  { hashId: 'ROL-S12',  name: 'agent',              description: 'Insurance agent / broker access',          organizationHashId: 'O-OZPY', isSystem: true },
  { hashId: 'ROL-S13',  name: 'customer_service',   description: 'Customer-facing service operations',       organizationHashId: 'O-OZPY', isSystem: true },
  { hashId: 'ROL-S14',  name: 'data_analyst',       description: 'Read-only data and analytics access',      organizationHashId: 'O-OZPY', isSystem: true },
  { hashId: 'ROL-S15',  name: 'api_client',         description: 'Machine-to-machine API access',            organizationHashId: 'O-OZPY', isSystem: true },
];

// Standard privileges for platform org
const SYSTEM_PRIVILEGES: PrivilegeDef[] = [
  { hashId: 'PRV-SYS1', name: 'users:read',           description: 'Read user records',            resource: 'users',           action: 'read',   organizationHashId: 'O-OZPY' },
  { hashId: 'PRV-SYS2', name: 'users:write',          description: 'Create/update users',          resource: 'users',           action: 'write',  organizationHashId: 'O-OZPY' },
  { hashId: 'PRV-SYS3', name: 'users:delete',         description: 'Delete users',                 resource: 'users',           action: 'delete', organizationHashId: 'O-OZPY' },
  { hashId: 'PRV-SYS4', name: 'roles:read',           description: 'Read roles',                   resource: 'roles',           action: 'read',   organizationHashId: 'O-OZPY' },
  { hashId: 'PRV-SYS5', name: 'roles:write',          description: 'Create/update roles',          resource: 'roles',           action: 'write',  organizationHashId: 'O-OZPY' },
  { hashId: 'PRV-SYS6', name: 'roles:delete',         description: 'Delete roles',                 resource: 'roles',           action: 'delete', organizationHashId: 'O-OZPY' },
  { hashId: 'PRV-SYS7', name: 'organizations:read',   description: 'Read organizations',           resource: 'organizations',   action: 'read',   organizationHashId: 'O-OZPY' },
  { hashId: 'PRV-SYS8', name: 'organizations:write',  description: 'Create/update organizations',  resource: 'organizations',   action: 'write',  organizationHashId: 'O-OZPY' },
  { hashId: 'PRV-SYS9', name: 'audit:read',           description: 'Read audit logs',              resource: 'audit',           action: 'read',   organizationHashId: 'O-OZPY' },
  { hashId: 'PRV-S10',  name: 'reports:read',         description: 'View reports',                 resource: 'reports',         action: 'read',   organizationHashId: 'O-OZPY' },
  { hashId: 'PRV-S11',  name: 'billing:read',         description: 'View billing information',     resource: 'billing',         action: 'read',   organizationHashId: 'O-OZPY' },
  { hashId: 'PRV-S12',  name: 'billing:write',        description: 'Manage billing',               resource: 'billing',         action: 'write',  organizationHashId: 'O-OZPY' },
  { hashId: 'PRV-S13',  name: 'quotations:read',      description: 'Read quotations',              resource: 'quotations',      action: 'read',   organizationHashId: 'O-OZPY' },
  { hashId: 'PRV-S14',  name: 'quotations:write',     description: 'Create/update quotations',     resource: 'quotations',      action: 'write',  organizationHashId: 'O-OZPY' },
  { hashId: 'PRV-S15',  name: 'claims:read',          description: 'Read claims',                  resource: 'claims',          action: 'read',   organizationHashId: 'O-OZPY' },
  { hashId: 'PRV-S16',  name: 'claims:write',         description: 'Create/update claims',         resource: 'claims',          action: 'write',  organizationHashId: 'O-OZPY' },
  { hashId: 'PRV-S17',  name: 'policies:read',        description: 'Read policy documents',        resource: 'policies',        action: 'read',   organizationHashId: 'O-OZPY' },
  { hashId: 'PRV-S18',  name: 'policies:write',       description: 'Create/update policies',       resource: 'policies',        action: 'write',  organizationHashId: 'O-OZPY' },
  { hashId: 'PRV-S19',  name: 'navigation:admin',     description: 'Manage navigation menus',      resource: 'navigation',      action: 'admin',  organizationHashId: 'O-OZPY' },
  { hashId: 'PRV-S20',  name: 'platform:admin',       description: 'Full platform administration', resource: 'platform',        action: 'admin',  organizationHashId: 'O-OZPY' },
];

// Which privileges each role gets (by privilege name)
const ROLE_PRIVILEGE_MAP: Record<string, string[]> = {
  'superadmin':       SYSTEM_PRIVILEGES.map(p => p.name), // all
  'platform_admin':   ['users:read','users:write','roles:read','roles:write','organizations:read','organizations:write','audit:read','reports:read','navigation:admin','platform:admin'],
  'org_admin':        ['users:read','users:write','users:delete','roles:read','roles:write','organizations:read','audit:read','reports:read','quotations:read','quotations:write','claims:read','claims:write','policies:read','policies:write'],
  'org_member':       ['users:read','quotations:read','quotations:write','claims:read','claims:write','policies:read'],
  'org_viewer':       ['users:read','quotations:read','claims:read','policies:read','reports:read'],
  'billing_admin':    ['billing:read','billing:write','organizations:read'],
  'audit_viewer':     ['audit:read'],
  'identity_admin':   ['users:read','users:write','users:delete','roles:read','roles:write','organizations:read','organizations:write'],
  'report_viewer':    ['reports:read','audit:read'],
  'underwriter':      ['quotations:read','quotations:write','policies:read','policies:write','reports:read'],
  'claims_handler':   ['claims:read','claims:write','policies:read','reports:read'],
  'agent':            ['quotations:read','quotations:write','policies:read'],
  'customer_service': ['users:read','quotations:read','claims:read','policies:read'],
  'data_analyst':     ['reports:read','audit:read','quotations:read','claims:read'],
  'api_client':       ['quotations:read','policies:read'],
};

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Privilege)
    private readonly privilegeRepo: Repository<Privilege>,
    @InjectRepository(RolePrivilege)
    private readonly rolePrivilegeRepo: Repository<RolePrivilege>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
  ) {}

  // ── System minimum seed (idempotent) ──────────────────────────────────────

  async seedSystem(): Promise<{ roles: number; privileges: number }> {
    let rolesSeeded = 0;
    let privilegesSeeded = 0;

    // Seed privileges (check by hashId)
    const privByName: Record<string, Privilege> = {};
    for (const pd of SYSTEM_PRIVILEGES) {
      let priv = await this.privilegeRepo.findOne({ where: { hashId: pd.hashId } });
      if (!priv) {
        priv = await this.privilegeRepo.save(
          this.privilegeRepo.create({
            hashId: pd.hashId,
            name: pd.name,
            description: pd.description,
            resource: pd.resource,
            action: pd.action,
            organizationHashId: pd.organizationHashId,
          }),
        );
        privilegesSeeded++;
        this.logger.log(`Seeded privilege ${pd.hashId} (${pd.name})`);
      }
      privByName[pd.name] = priv;
    }

    // Seed roles
    for (const rd of SYSTEM_ROLES) {
      let role = await this.roleRepo.findOne({ where: { hashId: rd.hashId } });
      if (!role) {
        role = await this.roleRepo.save(
          this.roleRepo.create({
            hashId: rd.hashId,
            name: rd.name,
            description: rd.description,
            organizationHashId: rd.organizationHashId,
            isSystem: rd.isSystem,
            status: RoleStatus.ACTIVE,
          }),
        );
        rolesSeeded++;
        this.logger.log(`Seeded role ${rd.hashId} (${rd.name})`);
      }

      // Assign privileges to role (idempotent)
      const privNames = ROLE_PRIVILEGE_MAP[rd.name] ?? [];
      for (const privName of privNames) {
        const priv = privByName[privName];
        if (!priv) continue;
        const existing = await this.rolePrivilegeRepo.findOne({
          where: { roleId: role.id, privilegeId: priv.id },
        });
        if (!existing) {
          await this.rolePrivilegeRepo.save(
            this.rolePrivilegeRepo.create({
              roleId: role.id,
              privilegeId: priv.id,
            }),
          );
        }
      }
    }

    return { roles: rolesSeeded, privileges: privilegesSeeded };
  }

  // ── Demo seed ─────────────────────────────────────────────────────────────

  async seedDemo(): Promise<{ roles: number; privileges: number }> {
    // Flush old demo user-role assignments
    await this.flushDemo();

    // Assign demo users to org_admin role under their orgs
    const demoAssignments = [
      { userHashId: 'U-DM01', roleHashId: 'ROL-SYS3', organizationHashId: 'O-DEMO1' },
      { userHashId: 'U-DM02', roleHashId: 'ROL-SYS3', organizationHashId: 'O-DEMO2' },
      { userHashId: 'U-DM03', roleHashId: 'ROL-SYS3', organizationHashId: 'O-DEMO3' },
    ];

    for (const a of demoAssignments) {
      const existing = await this.userRoleRepo.findOne({
        where: { userHashId: a.userHashId, roleHashId: a.roleHashId, organizationHashId: a.organizationHashId },
      });
      if (!existing) {
        await this.userRoleRepo.save(this.userRoleRepo.create(a));
      }
    }

    this.logger.log(`Demo seed complete: ${demoAssignments.length} user-role assignments`);
    return { roles: demoAssignments.length, privileges: 0 };
  }

  // ── Flush demo data ───────────────────────────────────────────────────────

  async flushDemo(): Promise<{ roles: number; privileges: number }> {
    const demoUserHashIds = ['U-DM01', 'U-DM02', 'U-DM03'];
    const demoUserRoles = await this.userRoleRepo.find({
      where: demoUserHashIds.map(id => ({ userHashId: id })),
    });

    if (demoUserRoles.length > 0) {
      await this.userRoleRepo.remove(demoUserRoles);
    }

    this.logger.log(`Flushed demo user-role assignments: ${demoUserRoles.length}`);
    return { roles: demoUserRoles.length, privileges: 0 };
  }

  // ── Flush all ─────────────────────────────────────────────────────────────

  async flushAll(confirm: string): Promise<{ roles: number; privileges: number }> {
    if (confirm !== 'yes') {
      throw new BadRequestException('Must pass ?confirm=yes to flush all data');
    }

    const roleCount = await this.roleRepo.count();
    const privilegeCount = await this.privilegeRepo.count();

    await this.rolePrivilegeRepo.query('TRUNCATE TABLE role_privileges CASCADE');
    await this.userRoleRepo.query('TRUNCATE TABLE user_roles CASCADE');
    await this.roleRepo.query('TRUNCATE TABLE roles CASCADE');
    await this.privilegeRepo.query('TRUNCATE TABLE privileges CASCADE');

    this.logger.warn(`Flushed ALL authorization data: ${roleCount} roles, ${privilegeCount} privileges`);
    return { roles: roleCount, privileges: privilegeCount };
  }
}
