/**
 * Canonical event type constants for the authorization domain.
 * Naming convention: domain.entity.action
 */
export const AuthorizationEvents = {
  ROLE_CREATED: 'authorization.role.created',
  ROLE_UPDATED: 'authorization.role.updated',
  ROLE_DELETED: 'authorization.role.deleted',
  PRIVILEGE_ASSIGNED: 'authorization.privilege.assigned',
  PRIVILEGE_REVOKED: 'authorization.privilege.revoked',
  POLICY_EVALUATED: 'authorization.policy.evaluated',
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
