import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { randomBytes } from 'crypto';
import { Role, RoleStatus } from '../models/entities/role.entity';
import { Privilege } from '../models/entities/privilege.entity';
import { RolePrivilege } from '../models/entities/role-privilege.entity';
import { UserRole } from '../models/entities/user-role.entity';
import { PrivilegeV2 } from '../models/entities/privilege-v2.entity';
import { RolePrivilegeV2 } from '../models/entities/role-privilege-v2.entity';
import { PrivilegeSection } from '../models/entities/privilege-section.entity';

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

// ── V2 Privilege Definitions (dot-notation, privilege-based RBAC) ────────────
// These are the PLATFORM-LEVEL privileges. Each module seeds its own module-specific
// privileges separately. Privilege codes follow: {module}.{resource}.{action}

interface V2SectionDef {
  id: string;
  sectionCode: string;
  sectionLabel: string;
  icon: string | null;
  seqNumber: number;
  visibleInMenu: boolean;
}

interface V2PrivilegeDef {
  id: string;
  privilegeCode: string;
  privilegeLabel: string;
  sectionCode: string;
  visibleInMenu: boolean;
}

const PLATFORM_SECTIONS: V2SectionDef[] = [
  { id: 'SEC-PLAT', sectionCode: 'platform',      sectionLabel: 'Platform',          icon: 'Shield',       seqNumber: 0, visibleInMenu: false },
  { id: 'SEC-IDNT', sectionCode: 'identity',       sectionLabel: 'Identity',          icon: 'Users',        seqNumber: 1, visibleInMenu: true },
  { id: 'SEC-AUTH', sectionCode: 'authorization',   sectionLabel: 'Authorization',     icon: 'Lock',         seqNumber: 2, visibleInMenu: true },
  { id: 'SEC-NAVG', sectionCode: 'navigation',      sectionLabel: 'Navigation',        icon: 'Menu',         seqNumber: 3, visibleInMenu: true },
  { id: 'SEC-AUDT', sectionCode: 'audit',           sectionLabel: 'Audit',             icon: 'FileText',     seqNumber: 4, visibleInMenu: true },
  { id: 'SEC-MSGN', sectionCode: 'messaging',       sectionLabel: 'Messaging',         icon: 'MessageSquare',seqNumber: 5, visibleInMenu: true },
  { id: 'SEC-PIIV', sectionCode: 'piivault',        sectionLabel: 'PII Vault',         icon: 'ShieldCheck',  seqNumber: 6, visibleInMenu: true },
  { id: 'SEC-DTBL', sectionCode: 'datatable',       sectionLabel: 'DataTable',         icon: 'Table',        seqNumber: 10, visibleInMenu: true },
  { id: 'SEC-FBLR', sectionCode: 'formbuilder',     sectionLabel: 'Form Builder',      icon: 'FileInput',    seqNumber: 11, visibleInMenu: true },
  { id: 'SEC-AIPR', sectionCode: 'ai',              sectionLabel: 'AI Gateway',        icon: 'Brain',        seqNumber: 12, visibleInMenu: true },
  { id: 'SEC-DCGN', sectionCode: 'docgen',          sectionLabel: 'Doc Generator',     icon: 'FileOutput',   seqNumber: 13, visibleInMenu: true },
  { id: 'SEC-PRPR', sectionCode: 'productpricing',  sectionLabel: 'Product Pricing',   icon: 'DollarSign',   seqNumber: 14, visibleInMenu: true },
  { id: 'SEC-WLBL', sectionCode: 'whitelabel',      sectionLabel: 'White Label',       icon: 'Palette',      seqNumber: 15, visibleInMenu: true },
  { id: 'SEC-VRFY', sectionCode: 'verification',    sectionLabel: 'Verification',      icon: 'CheckCircle',  seqNumber: 16, visibleInMenu: true },
  { id: 'SEC-RTCM', sectionCode: 'rtc',             sectionLabel: 'RTC',               icon: 'Video',        seqNumber: 17, visibleInMenu: true },
  { id: 'SEC-CHAT', sectionCode: 'chat',            sectionLabel: 'Chat',              icon: 'MessageCircle',seqNumber: 18, visibleInMenu: true },
  { id: 'SEC-IREC', sectionCode: 'recorder',        sectionLabel: 'Interaction Recorder', icon: 'Mic',       seqNumber: 19, visibleInMenu: true },
  { id: 'SEC-ZMBF', sectionCode: 'zmb',             sectionLabel: 'ZMB Factory',       icon: 'Factory',      seqNumber: 20, visibleInMenu: true },
  { id: 'SEC-PCG4', sectionCode: 'pcg4',            sectionLabel: 'Product Configurator', icon: 'Settings',  seqNumber: 30, visibleInMenu: true },
  { id: 'SEC-HIQT', sectionCode: 'hiquotation',     sectionLabel: 'HI Quotation',      icon: 'FileText',     seqNumber: 31, visibleInMenu: true },
  { id: 'SEC-HIDC', sectionCode: 'hidecisioning',   sectionLabel: 'HI Decisioning',    icon: 'GitBranch',    seqNumber: 32, visibleInMenu: true },
  { id: 'SEC-UWWF', sectionCode: 'uwworkflow',      sectionLabel: 'UW Workflow',        icon: 'Workflow',     seqNumber: 33, visibleInMenu: true },
];

const PLATFORM_PRIVILEGES_V2: V2PrivilegeDef[] = [
  // ── Platform core (non-menu, system-level) ────────────────────────────────
  { id: 'PRV-PL01', privilegeCode: 'platform.namespace.bypass',  privilegeLabel: 'Cross-Organization Access',   sectionCode: 'platform', visibleInMenu: false },
  { id: 'PRV-PL02', privilegeCode: 'platform.seed.execute',      privilegeLabel: 'Execute Platform Seeds',       sectionCode: 'platform', visibleInMenu: false },
  { id: 'PRV-PL03', privilegeCode: 'platform.admin.access',      privilegeLabel: 'Platform Administration',      sectionCode: 'platform', visibleInMenu: false },

  // ── Identity ──────────────────────────────────────────────────────────────
  { id: 'PRV-ID01', privilegeCode: 'identity.user.read',         privilegeLabel: 'View Users',                   sectionCode: 'identity', visibleInMenu: true },
  { id: 'PRV-ID02', privilegeCode: 'identity.user.create',       privilegeLabel: 'Create Users',                 sectionCode: 'identity', visibleInMenu: false },
  { id: 'PRV-ID03', privilegeCode: 'identity.user.update',       privilegeLabel: 'Update Users',                 sectionCode: 'identity', visibleInMenu: false },
  { id: 'PRV-ID04', privilegeCode: 'identity.user.delete',       privilegeLabel: 'Delete Users',                 sectionCode: 'identity', visibleInMenu: false },
  { id: 'PRV-ID05', privilegeCode: 'identity.user.manage',       privilegeLabel: 'Manage Users',                 sectionCode: 'identity', visibleInMenu: true },
  { id: 'PRV-ID06', privilegeCode: 'identity.org.read',          privilegeLabel: 'View Organizations',           sectionCode: 'identity', visibleInMenu: true },
  { id: 'PRV-ID07', privilegeCode: 'identity.org.manage',        privilegeLabel: 'Manage Organizations',         sectionCode: 'identity', visibleInMenu: true },
  { id: 'PRV-ID08', privilegeCode: 'identity.session.read',      privilegeLabel: 'View Sessions',                sectionCode: 'identity', visibleInMenu: false },
  { id: 'PRV-ID09', privilegeCode: 'identity.session.delete',    privilegeLabel: 'Revoke Sessions',              sectionCode: 'identity', visibleInMenu: false },
  { id: 'PRV-ID10', privilegeCode: 'identity.auth.impersonate',  privilegeLabel: 'Impersonate Users',            sectionCode: 'identity', visibleInMenu: false },

  // ── Authorization ─────────────────────────────────────────────────────────
  { id: 'PRV-AZ01', privilegeCode: 'authorization.role.read',       privilegeLabel: 'View Roles',                sectionCode: 'authorization', visibleInMenu: true },
  { id: 'PRV-AZ02', privilegeCode: 'authorization.role.create',     privilegeLabel: 'Create Roles',              sectionCode: 'authorization', visibleInMenu: false },
  { id: 'PRV-AZ03', privilegeCode: 'authorization.role.update',     privilegeLabel: 'Update Roles',              sectionCode: 'authorization', visibleInMenu: false },
  { id: 'PRV-AZ04', privilegeCode: 'authorization.role.delete',     privilegeLabel: 'Delete Roles',              sectionCode: 'authorization', visibleInMenu: false },
  { id: 'PRV-AZ05', privilegeCode: 'authorization.role.manage',     privilegeLabel: 'Manage Roles',              sectionCode: 'authorization', visibleInMenu: true },
  { id: 'PRV-AZ06', privilegeCode: 'authorization.privilege.read',  privilegeLabel: 'View Privileges',           sectionCode: 'authorization', visibleInMenu: true },
  { id: 'PRV-AZ07', privilegeCode: 'authorization.privilege.manage',privilegeLabel: 'Manage Privileges',         sectionCode: 'authorization', visibleInMenu: true },
  { id: 'PRV-AZ08', privilegeCode: 'authorization.userrole.read',   privilegeLabel: 'View User Roles',           sectionCode: 'authorization', visibleInMenu: false },
  { id: 'PRV-AZ09', privilegeCode: 'authorization.userrole.assign', privilegeLabel: 'Assign Roles to Users',     sectionCode: 'authorization', visibleInMenu: false },
  { id: 'PRV-AZ10', privilegeCode: 'authorization.userrole.remove', privilegeLabel: 'Remove User Roles',         sectionCode: 'authorization', visibleInMenu: false },

  // ── Navigation ────────────────────────────────────────────────────────────
  { id: 'PRV-NV01', privilegeCode: 'navigation.menu.read',    privilegeLabel: 'View Menus',     sectionCode: 'navigation', visibleInMenu: true },
  { id: 'PRV-NV02', privilegeCode: 'navigation.menu.manage',  privilegeLabel: 'Manage Menus',   sectionCode: 'navigation', visibleInMenu: true },
  { id: 'PRV-NV03', privilegeCode: 'navigation.module.manage',privilegeLabel: 'Manage Modules', sectionCode: 'navigation', visibleInMenu: false },

  // ── Audit ─────────────────────────────────────────────────────────────────
  { id: 'PRV-AU01', privilegeCode: 'audit.log.read',     privilegeLabel: 'View Audit Logs',   sectionCode: 'audit', visibleInMenu: true },
  { id: 'PRV-AU02', privilegeCode: 'audit.log.export',   privilegeLabel: 'Export Audit Logs', sectionCode: 'audit', visibleInMenu: false },

  // ── Messaging ─────────────────────────────────────────────────────────────
  { id: 'PRV-MG01', privilegeCode: 'messaging.topic.read',    privilegeLabel: 'View Topics',     sectionCode: 'messaging', visibleInMenu: true },
  { id: 'PRV-MG02', privilegeCode: 'messaging.topic.manage',  privilegeLabel: 'Manage Topics',   sectionCode: 'messaging', visibleInMenu: true },
  { id: 'PRV-MG03', privilegeCode: 'messaging.dlq.read',      privilegeLabel: 'View DLQ',        sectionCode: 'messaging', visibleInMenu: true },
  { id: 'PRV-MG04', privilegeCode: 'messaging.dlq.manage',    privilegeLabel: 'Manage DLQ',      sectionCode: 'messaging', visibleInMenu: false },

  // ── PII Vault ─────────────────────────────────────────────────────────────
  { id: 'PRV-PV01', privilegeCode: 'piivault.token.create',        privilegeLabel: 'Tokenize PII',             sectionCode: 'piivault', visibleInMenu: false },
  { id: 'PRV-PV02', privilegeCode: 'piivault.token.read',          privilegeLabel: 'Detokenize PII',           sectionCode: 'piivault', visibleInMenu: false },
  { id: 'PRV-PV03', privilegeCode: 'piivault.token.delete',        privilegeLabel: 'Delete PII Tokens',        sectionCode: 'piivault', visibleInMenu: false },
  { id: 'PRV-PV04', privilegeCode: 'piivault.visibility.manage',   privilegeLabel: 'Manage Visibility Policies',sectionCode: 'piivault', visibleInMenu: true },

  // ── DataTable ─────────────────────────────────────────────────────────────
  { id: 'PRV-DT01', privilegeCode: 'datatable.page.create',  privilegeLabel: 'Create Page Definitions',  sectionCode: 'datatable', visibleInMenu: false },
  { id: 'PRV-DT02', privilegeCode: 'datatable.page.read',    privilegeLabel: 'View Page Definitions',    sectionCode: 'datatable', visibleInMenu: true },
  { id: 'PRV-DT03', privilegeCode: 'datatable.page.update',  privilegeLabel: 'Update Page Definitions',  sectionCode: 'datatable', visibleInMenu: false },
  { id: 'PRV-DT04', privilegeCode: 'datatable.page.delete',  privilegeLabel: 'Delete Page Definitions',  sectionCode: 'datatable', visibleInMenu: false },
  { id: 'PRV-DT05', privilegeCode: 'datatable.query.read',   privilegeLabel: 'Query Data',               sectionCode: 'datatable', visibleInMenu: true },
  { id: 'PRV-DT06', privilegeCode: 'datatable.export.execute',privilegeLabel: 'Export Data',              sectionCode: 'datatable', visibleInMenu: false },
  { id: 'PRV-DT07', privilegeCode: 'datatable.queue.manage', privilegeLabel: 'Manage FQP Queues',        sectionCode: 'datatable', visibleInMenu: true },
  { id: 'PRV-DT08', privilegeCode: 'datatable.view.manage',  privilegeLabel: 'Manage Named Views',       sectionCode: 'datatable', visibleInMenu: false },

  // ── Form Builder ──────────────────────────────────────────────────────────
  { id: 'PRV-FB01', privilegeCode: 'formbuilder.form.create',       privilegeLabel: 'Create Forms',         sectionCode: 'formbuilder', visibleInMenu: false },
  { id: 'PRV-FB02', privilegeCode: 'formbuilder.form.read',         privilegeLabel: 'View Forms',           sectionCode: 'formbuilder', visibleInMenu: true },
  { id: 'PRV-FB03', privilegeCode: 'formbuilder.form.update',       privilegeLabel: 'Update Forms',         sectionCode: 'formbuilder', visibleInMenu: false },
  { id: 'PRV-FB04', privilegeCode: 'formbuilder.form.delete',       privilegeLabel: 'Delete Forms',         sectionCode: 'formbuilder', visibleInMenu: false },
  { id: 'PRV-FB05', privilegeCode: 'formbuilder.submission.create', privilegeLabel: 'Submit Forms',         sectionCode: 'formbuilder', visibleInMenu: false },
  { id: 'PRV-FB06', privilegeCode: 'formbuilder.submission.read',   privilegeLabel: 'View Submissions',     sectionCode: 'formbuilder', visibleInMenu: true },
  { id: 'PRV-FB07', privilegeCode: 'formbuilder.token.manage',      privilegeLabel: 'Manage Form Tokens',   sectionCode: 'formbuilder', visibleInMenu: false },

  // ── AI Gateway ────────────────────────────────────────────────────────────
  { id: 'PRV-AI01', privilegeCode: 'ai.completion.execute',  privilegeLabel: 'AI Completions',       sectionCode: 'ai', visibleInMenu: true },
  { id: 'PRV-AI02', privilegeCode: 'ai.chat.execute',        privilegeLabel: 'AI Chat',              sectionCode: 'ai', visibleInMenu: true },
  { id: 'PRV-AI03', privilegeCode: 'ai.transcribe.execute',  privilegeLabel: 'AI Transcription',     sectionCode: 'ai', visibleInMenu: false },
  { id: 'PRV-AI04', privilegeCode: 'ai.synthesize.execute',  privilegeLabel: 'AI Speech Synthesis',  sectionCode: 'ai', visibleInMenu: false },
  { id: 'PRV-AI05', privilegeCode: 'ai.embedding.execute',   privilegeLabel: 'AI Embeddings',        sectionCode: 'ai', visibleInMenu: false },
  { id: 'PRV-AI06', privilegeCode: 'ai.model.read',          privilegeLabel: 'View AI Models',       sectionCode: 'ai', visibleInMenu: true },
  { id: 'PRV-AI07', privilegeCode: 'ai.model.manage',        privilegeLabel: 'Manage AI Models',     sectionCode: 'ai', visibleInMenu: false },
  { id: 'PRV-AI08', privilegeCode: 'ai.usage.read',          privilegeLabel: 'View AI Usage',        sectionCode: 'ai', visibleInMenu: true },
  { id: 'PRV-AI09', privilegeCode: 'ai.ratelimit.manage',    privilegeLabel: 'Manage AI Rate Limits',sectionCode: 'ai', visibleInMenu: false },

  // ── Doc Generator ─────────────────────────────────────────────────────────
  { id: 'PRV-DG01', privilegeCode: 'docgen.template.read',    privilegeLabel: 'View Templates',      sectionCode: 'docgen', visibleInMenu: true },
  { id: 'PRV-DG02', privilegeCode: 'docgen.template.manage',  privilegeLabel: 'Manage Templates',    sectionCode: 'docgen', visibleInMenu: true },
  { id: 'PRV-DG03', privilegeCode: 'docgen.document.generate',privilegeLabel: 'Generate Documents',  sectionCode: 'docgen', visibleInMenu: false },

  // ── Product Pricing ───────────────────────────────────────────────────────
  { id: 'PRV-PP01', privilegeCode: 'productpricing.ratetable.read',   privilegeLabel: 'View Rate Tables',    sectionCode: 'productpricing', visibleInMenu: true },
  { id: 'PRV-PP02', privilegeCode: 'productpricing.ratetable.manage', privilegeLabel: 'Manage Rate Tables',  sectionCode: 'productpricing', visibleInMenu: true },
  { id: 'PRV-PP03', privilegeCode: 'productpricing.lookup.execute',   privilegeLabel: 'Rate Lookup',         sectionCode: 'productpricing', visibleInMenu: false },

  // ── White Label ───────────────────────────────────────────────────────────
  { id: 'PRV-WL01', privilegeCode: 'whitelabel.theme.read',    privilegeLabel: 'View Themes',    sectionCode: 'whitelabel', visibleInMenu: true },
  { id: 'PRV-WL02', privilegeCode: 'whitelabel.theme.manage',  privilegeLabel: 'Manage Themes',  sectionCode: 'whitelabel', visibleInMenu: true },

  // ── KYC (renamed 2026-04-21 from verification) ────────────────────────────
  { id: 'PRV-KY01', privilegeCode: 'kyc.view',             privilegeLabel: 'View KYC Module',          sectionCode: 'kyc', visibleInMenu: true },
  { id: 'PRV-KY02', privilegeCode: 'kyc.session.create',   privilegeLabel: 'Create KYC Sessions',       sectionCode: 'kyc', visibleInMenu: false },
  { id: 'PRV-KY03', privilegeCode: 'kyc.session.read',     privilegeLabel: 'View KYC Sessions',         sectionCode: 'kyc', visibleInMenu: true },
  { id: 'PRV-KY04', privilegeCode: 'kyc.evidence.read',    privilegeLabel: 'View KYC Evidence',         sectionCode: 'kyc', visibleInMenu: true },
  { id: 'PRV-KY05', privilegeCode: 'kyc.providers.read',   privilegeLabel: 'View KYC Providers',        sectionCode: 'kyc', visibleInMenu: true },
  { id: 'PRV-KY06', privilegeCode: 'kyc.providers.manage', privilegeLabel: 'Manage KYC Providers',      sectionCode: 'kyc', visibleInMenu: false },

  // ── RTC ───────────────────────────────────────────────────────────────────
  { id: 'PRV-RT01', privilegeCode: 'rtc.room.create',   privilegeLabel: 'Create Rooms',    sectionCode: 'rtc', visibleInMenu: false },
  { id: 'PRV-RT02', privilegeCode: 'rtc.room.read',     privilegeLabel: 'View Rooms',      sectionCode: 'rtc', visibleInMenu: true },
  { id: 'PRV-RT03', privilegeCode: 'rtc.room.manage',   privilegeLabel: 'Manage Rooms',    sectionCode: 'rtc', visibleInMenu: true },
  { id: 'PRV-RT04', privilegeCode: 'rtc.call.read',     privilegeLabel: 'View Call History',sectionCode: 'rtc', visibleInMenu: true },

  // ── Chat ──────────────────────────────────────────────────────────────────
  { id: 'PRV-CH01', privilegeCode: 'chat.channel.create',  privilegeLabel: 'Create Channels',    sectionCode: 'chat', visibleInMenu: false },
  { id: 'PRV-CH02', privilegeCode: 'chat.channel.read',    privilegeLabel: 'View Channels',      sectionCode: 'chat', visibleInMenu: true },
  { id: 'PRV-CH03', privilegeCode: 'chat.channel.manage',  privilegeLabel: 'Manage Channels',    sectionCode: 'chat', visibleInMenu: true },
  { id: 'PRV-CH04', privilegeCode: 'chat.message.create',  privilegeLabel: 'Send Messages',      sectionCode: 'chat', visibleInMenu: false },
  { id: 'PRV-CH05', privilegeCode: 'chat.message.read',    privilegeLabel: 'Read Messages',      sectionCode: 'chat', visibleInMenu: false },
  { id: 'PRV-CH06', privilegeCode: 'chat.message.manage',  privilegeLabel: 'Manage Messages',    sectionCode: 'chat', visibleInMenu: false },

  // ── Interaction Recorder ──────────────────────────────────────────────────
  { id: 'PRV-IR01', privilegeCode: 'recorder.interaction.create',   privilegeLabel: 'Create Interactions',    sectionCode: 'recorder', visibleInMenu: false },
  { id: 'PRV-IR02', privilegeCode: 'recorder.interaction.read',     privilegeLabel: 'View Interactions',      sectionCode: 'recorder', visibleInMenu: true },
  { id: 'PRV-IR03', privilegeCode: 'recorder.interaction.manage',   privilegeLabel: 'Manage Interactions',    sectionCode: 'recorder', visibleInMenu: true },
  { id: 'PRV-IR04', privilegeCode: 'recorder.template.manage',      privilegeLabel: 'Manage Templates',       sectionCode: 'recorder', visibleInMenu: true },

  // ── ZMB Factory ───────────────────────────────────────────────────────────
  { id: 'PRV-ZF01', privilegeCode: 'zmb.generate.execute', privilegeLabel: 'Generate Modules',  sectionCode: 'zmb', visibleInMenu: true },
  { id: 'PRV-ZF02', privilegeCode: 'zmb.history.read',     privilegeLabel: 'View History',      sectionCode: 'zmb', visibleInMenu: true },

  // ── PCG4 ──────────────────────────────────────────────────────────────────
  { id: 'PRV-P401', privilegeCode: 'pcg4.configuration.read',    privilegeLabel: 'View Configurations',    sectionCode: 'pcg4', visibleInMenu: true },
  { id: 'PRV-P402', privilegeCode: 'pcg4.configuration.create',  privilegeLabel: 'Create Configurations',  sectionCode: 'pcg4', visibleInMenu: false },
  { id: 'PRV-P403', privilegeCode: 'pcg4.configuration.manage',  privilegeLabel: 'Manage Configurations',  sectionCode: 'pcg4', visibleInMenu: true },
  { id: 'PRV-P404', privilegeCode: 'pcg4.plan.manage',           privilegeLabel: 'Manage Plans',           sectionCode: 'pcg4', visibleInMenu: true },
  { id: 'PRV-P405', privilegeCode: 'pcg4.encounter.manage',      privilegeLabel: 'Manage Encounters',      sectionCode: 'pcg4', visibleInMenu: true },
  { id: 'PRV-P406', privilegeCode: 'pcg4.setup.manage',          privilegeLabel: 'Manage Setup',           sectionCode: 'pcg4', visibleInMenu: false },

  // ── HI Quotation ──────────────────────────────────────────────────────────
  { id: 'PRV-HQ01', privilegeCode: 'hiquotation.quotation.read',    privilegeLabel: 'View Quotations',        sectionCode: 'hiquotation', visibleInMenu: true },
  { id: 'PRV-HQ02', privilegeCode: 'hiquotation.quotation.create',  privilegeLabel: 'Create Quotations',      sectionCode: 'hiquotation', visibleInMenu: false },
  { id: 'PRV-HQ03', privilegeCode: 'hiquotation.quotation.manage',  privilegeLabel: 'Manage Quotations',      sectionCode: 'hiquotation', visibleInMenu: true },
  { id: 'PRV-HQ04', privilegeCode: 'hiquotation.member.manage',     privilegeLabel: 'Manage Members',         sectionCode: 'hiquotation', visibleInMenu: false },
  { id: 'PRV-HQ05', privilegeCode: 'hiquotation.analytics.read',    privilegeLabel: 'View Analytics',         sectionCode: 'hiquotation', visibleInMenu: true },

  // ── HI UW Decisioning (renamed 2026-04-21 from hi_decisioning) ────────────
  // Legacy "hidecisioning.*" codes retained for back-compat; new canonical
  // codes are "hi_uw_decisioning.*" to disambiguate from future sibling
  // decisioning modules (claim_adjudication_decisioning, etc.).
  { id: 'PRV-HD01', privilegeCode: 'hidecisioning.rule.read',       privilegeLabel: 'View Rules (legacy)',      sectionCode: 'hidecisioning', visibleInMenu: true },
  { id: 'PRV-HD02', privilegeCode: 'hidecisioning.rule.manage',     privilegeLabel: 'Manage Rules (legacy)',    sectionCode: 'hidecisioning', visibleInMenu: true },
  { id: 'PRV-HD03', privilegeCode: 'hidecisioning.evaluate.execute',privilegeLabel: 'Execute Evaluations (legacy)', sectionCode: 'hidecisioning', visibleInMenu: false },
  { id: 'PRV-HD04', privilegeCode: 'hidecisioning.loading.manage',  privilegeLabel: 'Manage Loading Tables (legacy)', sectionCode: 'hidecisioning', visibleInMenu: true },
  { id: 'PRV-HD05', privilegeCode: 'hidecisioning.stp.manage',      privilegeLabel: 'Manage STP Criteria (legacy)', sectionCode: 'hidecisioning', visibleInMenu: true },
  // Canonical hi_uw_decisioning.* codes (match the module's own manifest)
  { id: 'PRV-HUD01', privilegeCode: 'hi_uw_decisioning.view',              privilegeLabel: 'View HI UW Decisioning',    sectionCode: 'hi_uw_decisioning', visibleInMenu: true },
  { id: 'PRV-HUD02', privilegeCode: 'hi_uw_decisioning.rules.read',        privilegeLabel: 'View Rules',                sectionCode: 'hi_uw_decisioning', visibleInMenu: true },
  { id: 'PRV-HUD03', privilegeCode: 'hi_uw_decisioning.rules.manage',      privilegeLabel: 'Manage Rules',              sectionCode: 'hi_uw_decisioning', visibleInMenu: true },
  { id: 'PRV-HUD04', privilegeCode: 'hi_uw_decisioning.evaluations.read',  privilegeLabel: 'View Evaluations',          sectionCode: 'hi_uw_decisioning', visibleInMenu: true },
  { id: 'PRV-HUD05', privilegeCode: 'hi_uw_decisioning.evaluate',          privilegeLabel: 'Execute Evaluations',       sectionCode: 'hi_uw_decisioning', visibleInMenu: false },
  { id: 'PRV-HUD06', privilegeCode: 'hi_uw_decisioning.loading_tables.read', privilegeLabel: 'View Loading Tables',     sectionCode: 'hi_uw_decisioning', visibleInMenu: true },
  { id: 'PRV-HUD07', privilegeCode: 'hi_uw_decisioning.stp_criteria.read', privilegeLabel: 'View STP Criteria',         sectionCode: 'hi_uw_decisioning', visibleInMenu: true },
  { id: 'PRV-HUD08', privilegeCode: 'hi_uw_decisioning.admin',             privilegeLabel: 'Administer HI UW Decisioning', sectionCode: 'hi_uw_decisioning', visibleInMenu: false },

  // ── Tele-UW (scaffolded 2026-04-21 — avatar of zorbit-ai-jayna) ───────────
  { id: 'PRV-TUW01', privilegeCode: 'tele_uw.view',              privilegeLabel: 'View Tele-UW',                sectionCode: 'tele_uw', visibleInMenu: true },
  { id: 'PRV-TUW02', privilegeCode: 'tele_uw.campaign.read',     privilegeLabel: 'View Campaigns',              sectionCode: 'tele_uw', visibleInMenu: true },
  { id: 'PRV-TUW03', privilegeCode: 'tele_uw.campaign.manage',   privilegeLabel: 'Manage Campaigns',            sectionCode: 'tele_uw', visibleInMenu: true },
  { id: 'PRV-TUW04', privilegeCode: 'tele_uw.call.read',         privilegeLabel: 'View Call Attempts',          sectionCode: 'tele_uw', visibleInMenu: true },
  { id: 'PRV-TUW05', privilegeCode: 'tele_uw.call.initiate',     privilegeLabel: 'Initiate Calls',              sectionCode: 'tele_uw', visibleInMenu: false },
  { id: 'PRV-TUW06', privilegeCode: 'tele_uw.call.review',       privilegeLabel: 'Review Calls',                sectionCode: 'tele_uw', visibleInMenu: true },
  { id: 'PRV-TUW07', privilegeCode: 'tele_uw.dialogue.read',     privilegeLabel: 'View Dialogue Transcripts',   sectionCode: 'tele_uw', visibleInMenu: true },
  { id: 'PRV-TUW08', privilegeCode: 'tele_uw.dialogue.annotate', privilegeLabel: 'Annotate Dialogues',          sectionCode: 'tele_uw', visibleInMenu: true },
  { id: 'PRV-TUW09', privilegeCode: 'tele_uw.admin',             privilegeLabel: 'Administer Tele-UW',          sectionCode: 'tele_uw', visibleInMenu: false },

  // ── UW Workflow ───────────────────────────────────────────────────────────
  { id: 'PRV-UW01', privilegeCode: 'uwworkflow.action.read',        privilegeLabel: 'View Actions',        sectionCode: 'uwworkflow', visibleInMenu: true },
  { id: 'PRV-UW02', privilegeCode: 'uwworkflow.action.manage',      privilegeLabel: 'Manage Actions',      sectionCode: 'uwworkflow', visibleInMenu: true },
  { id: 'PRV-UW03', privilegeCode: 'uwworkflow.execute.execute',    privilegeLabel: 'Execute Workflows',   sectionCode: 'uwworkflow', visibleInMenu: false },
  { id: 'PRV-UW04', privilegeCode: 'uwworkflow.queue.read',         privilegeLabel: 'View Queues',         sectionCode: 'uwworkflow', visibleInMenu: true },
  { id: 'PRV-UW05', privilegeCode: 'uwworkflow.assignment.manage',  privilegeLabel: 'Manage Assignments',  sectionCode: 'uwworkflow', visibleInMenu: true },
  { id: 'PRV-UW06', privilegeCode: 'uwworkflow.policy.read',        privilegeLabel: 'View Policies',       sectionCode: 'uwworkflow', visibleInMenu: true },
  { id: 'PRV-UW07', privilegeCode: 'uwworkflow.policy.manage',      privilegeLabel: 'Manage Policies',     sectionCode: 'uwworkflow', visibleInMenu: true },
  { id: 'PRV-UW08', privilegeCode: 'uwworkflow.payment.manage',     privilegeLabel: 'Manage Payments',     sectionCode: 'uwworkflow', visibleInMenu: true },
];

/**
 * V2 Role-Privilege mapping: which V2 privilege codes each system role gets.
 * This is the CENTRAL authority for role-based access — NO hardcoded role name checks elsewhere.
 * superadmin gets ALL privileges.
 */
const ROLE_PRIVILEGE_V2_MAP: Record<string, string[]> = {
  'superadmin':       PLATFORM_PRIVILEGES_V2.map(p => p.privilegeCode), // ALL
  'platform_admin':   [
    'platform.admin.access',
    'identity.user.read', 'identity.user.manage', 'identity.org.read', 'identity.org.manage',
    'identity.session.read', 'identity.auth.impersonate',
    'authorization.role.read', 'authorization.role.manage', 'authorization.privilege.read', 'authorization.privilege.manage',
    'authorization.userrole.read', 'authorization.userrole.assign', 'authorization.userrole.remove',
    'navigation.menu.read', 'navigation.menu.manage', 'navigation.module.manage',
    'audit.log.read', 'audit.log.export',
    'messaging.topic.read', 'messaging.topic.manage', 'messaging.dlq.read', 'messaging.dlq.manage',
    'piivault.visibility.manage',
  ],
  'org_admin':        [
    'identity.user.read', 'identity.user.manage', 'identity.org.read',
    'identity.session.read',
    'authorization.role.read', 'authorization.role.manage',
    'authorization.userrole.read', 'authorization.userrole.assign', 'authorization.userrole.remove',
    'navigation.menu.read',
    'audit.log.read',
    'datatable.page.read', 'datatable.query.read', 'datatable.export.execute', 'datatable.queue.manage', 'datatable.view.manage',
    'formbuilder.form.read', 'formbuilder.submission.read',
    'ai.completion.execute', 'ai.chat.execute', 'ai.model.read', 'ai.usage.read',
    'piivault.visibility.manage',
    'whitelabel.theme.read', 'whitelabel.theme.manage',
    'pcg4.configuration.read', 'pcg4.configuration.manage', 'pcg4.plan.manage', 'pcg4.encounter.manage',
    'hiquotation.quotation.read', 'hiquotation.quotation.manage', 'hiquotation.analytics.read',
    'hidecisioning.rule.read', 'hidecisioning.rule.manage', 'hidecisioning.loading.manage', 'hidecisioning.stp.manage',
    'uwworkflow.action.read', 'uwworkflow.action.manage', 'uwworkflow.queue.read', 'uwworkflow.assignment.manage',
    'uwworkflow.policy.read', 'uwworkflow.policy.manage', 'uwworkflow.payment.manage',
  ],
  'org_member':       [
    'identity.user.read',
    'datatable.page.read', 'datatable.query.read',
    'formbuilder.form.read', 'formbuilder.submission.create', 'formbuilder.submission.read',
    'ai.completion.execute', 'ai.chat.execute',
    'chat.channel.read', 'chat.message.create', 'chat.message.read',
    'hiquotation.quotation.read', 'hiquotation.quotation.create',
    'uwworkflow.queue.read', 'uwworkflow.policy.read',
  ],
  'org_viewer':       [
    'identity.user.read',
    'audit.log.read',
    'datatable.page.read', 'datatable.query.read',
    'formbuilder.form.read', 'formbuilder.submission.read',
    'hiquotation.quotation.read', 'hiquotation.analytics.read',
    'uwworkflow.queue.read', 'uwworkflow.policy.read',
    'pcg4.configuration.read',
  ],
  'underwriter':      [
    'hiquotation.quotation.read', 'hiquotation.quotation.manage', 'hiquotation.member.manage',
    'hidecisioning.rule.read', 'hidecisioning.evaluate.execute', 'hidecisioning.loading.manage', 'hidecisioning.stp.manage',
    'uwworkflow.action.read', 'uwworkflow.execute.execute', 'uwworkflow.queue.read',
    'uwworkflow.assignment.manage', 'uwworkflow.policy.read', 'uwworkflow.policy.manage',
    'datatable.query.read', 'datatable.export.execute',
    'docgen.template.read', 'docgen.document.generate',
  ],
  'claims_handler':   [
    'hiquotation.quotation.read',
    'uwworkflow.queue.read', 'uwworkflow.policy.read',
    'datatable.query.read', 'datatable.export.execute',
    'docgen.template.read', 'docgen.document.generate',
  ],
  'agent':            [
    'hiquotation.quotation.read', 'hiquotation.quotation.create',
    'hiquotation.member.manage',
    'uwworkflow.policy.read',
    'formbuilder.form.read', 'formbuilder.submission.create',
  ],
  'identity_admin':   [
    'identity.user.read', 'identity.user.create', 'identity.user.update', 'identity.user.delete', 'identity.user.manage',
    'identity.org.read', 'identity.org.manage',
    'identity.session.read', 'identity.session.delete',
    'authorization.role.read', 'authorization.role.manage',
    'authorization.userrole.read', 'authorization.userrole.assign', 'authorization.userrole.remove',
  ],
  'audit_viewer':     ['audit.log.read', 'audit.log.export'],
  'report_viewer':    ['audit.log.read', 'datatable.query.read', 'datatable.export.execute', 'hiquotation.analytics.read'],
  'billing_admin':    ['identity.org.read'],
  'customer_service': [
    'identity.user.read',
    'hiquotation.quotation.read',
    'uwworkflow.queue.read', 'uwworkflow.policy.read',
    'chat.channel.read', 'chat.message.read',
  ],
  'data_analyst':     [
    'audit.log.read', 'audit.log.export',
    'datatable.query.read', 'datatable.export.execute',
    'hiquotation.quotation.read', 'hiquotation.analytics.read',
  ],
  'api_client':       [
    'hiquotation.quotation.read',
    'uwworkflow.policy.read',
    'formbuilder.form.read', 'formbuilder.submission.create',
  ],
};

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
    @InjectRepository(PrivilegeV2)
    private readonly privilegeV2Repo: Repository<PrivilegeV2>,
    @InjectRepository(RolePrivilegeV2)
    private readonly rolePrivilegeV2Repo: Repository<RolePrivilegeV2>,
    @InjectRepository(PrivilegeSection)
    private readonly sectionRepo: Repository<PrivilegeSection>,
  ) {}

  // ── System minimum seed (idempotent) ──────────────────────────────────────

  async seedSystem(): Promise<{ roles: number; privileges: number; v2Privileges?: number; v2Assignments?: number }> {
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

    // ── V2 Privilege Seeding (privilege-based RBAC) ──────────────────────────
    let v2PrivilegesSeeded = 0;
    let v2AssignmentsSeeded = 0;

    // Seed sections (idempotent)
    const sectionMap: Record<string, PrivilegeSection> = {};
    for (const sd of PLATFORM_SECTIONS) {
      let section = await this.sectionRepo.findOne({ where: { sectionCode: sd.sectionCode } });
      if (!section) {
        section = await this.sectionRepo.save(
          this.sectionRepo.create({
            id: sd.id,
            sectionCode: sd.sectionCode,
            sectionLabel: sd.sectionLabel,
            icon: sd.icon,
            seqNumber: sd.seqNumber,
            visible: sd.visibleInMenu,
          }),
        );
        this.logger.log(`Seeded V2 section ${sd.id} (${sd.sectionCode})`);
      }
      sectionMap[sd.sectionCode] = section;
    }

    // Seed V2 privileges (idempotent, check by privilegeCode)
    const privV2ByCode: Record<string, PrivilegeV2> = {};
    for (const pd of PLATFORM_PRIVILEGES_V2) {
      let priv = await this.privilegeV2Repo.findOne({ where: { privilegeCode: pd.privilegeCode } });
      if (!priv) {
        const section = sectionMap[pd.sectionCode];
        if (!section) {
          this.logger.warn(`Section '${pd.sectionCode}' not found for privilege '${pd.privilegeCode}'`);
          continue;
        }
        priv = await this.privilegeV2Repo.save(
          this.privilegeV2Repo.create({
            id: pd.id,
            privilegeCode: pd.privilegeCode,
            privilegeLabel: pd.privilegeLabel,
            sectionId: section.id,
            visibleInMenu: pd.visibleInMenu,
          }),
        );
        v2PrivilegesSeeded++;
        this.logger.log(`Seeded V2 privilege ${pd.id} (${pd.privilegeCode})`);
      }
      privV2ByCode[pd.privilegeCode] = priv;
    }

    // Assign V2 privileges to roles (idempotent)
    for (const rd of SYSTEM_ROLES) {
      const role = await this.roleRepo.findOne({ where: { hashId: rd.hashId } });
      if (!role) continue;

      const v2Codes = ROLE_PRIVILEGE_V2_MAP[rd.name] ?? [];
      for (const code of v2Codes) {
        const priv = privV2ByCode[code];
        if (!priv) continue;
        const existing = await this.rolePrivilegeV2Repo.findOne({
          where: { roleId: role.id, privilegeId: priv.id },
        });
        if (!existing) {
          await this.rolePrivilegeV2Repo.save(
            this.rolePrivilegeV2Repo.create({
              roleId: role.id,
              privilegeId: priv.id,
            }),
          );
          v2AssignmentsSeeded++;
        }
      }
    }

    this.logger.log(`V2 seed: ${v2PrivilegesSeeded} privileges, ${v2AssignmentsSeeded} role-privilege assignments`);

    return { roles: rolesSeeded, privileges: privilegesSeeded, v2Privileges: v2PrivilegesSeeded, v2Assignments: v2AssignmentsSeeded };
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
