/**
 * Canonical event type constants for the authorization domain.
 * Naming convention: domain.entity.action
 */
export const AuthorizationEvents = {
  ROLE_CREATED: 'authorization.role.created',
  ROLE_UPDATED: 'authorization.role.updated',
  ROLE_DELETED: 'authorization.role.deleted',
  PRIVILEGE_CREATED: 'authorization.privilege.created',
  PRIVILEGE_UPDATED: 'authorization.privilege.updated',
  PRIVILEGE_DELETED: 'authorization.privilege.deleted',
  PRIVILEGE_ASSIGNED: 'authorization.privilege.assigned',
  PRIVILEGE_REVOKED: 'authorization.privilege.revoked',
  POLICY_EVALUATED: 'authorization.policy.evaluated',

  // Privilege sections (navigation menu groupings)
  PRIVILEGE_SECTION_CREATED: 'authorization.privilege_section.created',
  PRIVILEGE_SECTION_UPDATED: 'authorization.privilege_section.updated',
  PRIVILEGE_SECTION_DELETED: 'authorization.privilege_section.deleted',

  // Navigation-driven privileges (v2)
  PRIVILEGE_V2_CREATED: 'authorization.privilege.created',
  PRIVILEGE_V2_UPDATED: 'authorization.privilege.updated',
  PRIVILEGE_V2_DELETED: 'authorization.privilege.deleted',

  // Role-privilege v2 assignments
  ROLE_PRIVILEGE_V2_ASSIGNED: 'authorization.role_privilege.assigned',
  ROLE_PRIVILEGE_V2_REVOKED: 'authorization.role_privilege.revoked',
} as const;

export type AuthorizationEventType =
  (typeof AuthorizationEvents)[keyof typeof AuthorizationEvents];

/**
 * Canonical event envelope for all Zorbit platform events.
 */
export interface ZorbitEventEnvelope<T = unknown> {
  eventId: string;
  eventType: AuthorizationEventType;
  timestamp: string;
  source: string;
  namespace: string;
  namespaceId: string;
  payload: T;
  metadata?: Record<string, string>;
}
