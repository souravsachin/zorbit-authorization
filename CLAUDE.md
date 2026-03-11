# Zorbit Service: zorbit-authorization

## Purpose

This repository implements the authorization service for the Zorbit platform.

Zorbit is a MACH-compliant shared platform infrastructure used to build enterprise applications.

The authorization service provides role-based access control (RBAC), privilege management, and policy enforcement across the platform.

## Responsibilities

- Role management (CRUD, scoped to organizations)
- Privilege definition and management
- Role-privilege assignment
- User-role assignment
- Policy evaluation (given user, action, resource, namespace -> allow/deny)
- Namespace-scoped authorization enforcement
- System role seeding (admin, member, viewer)

## Architecture Context

This service follows Zorbit platform architecture.

Key rules:

- REST API grammar: /api/v1/{namespace}/{namespace_id}/resource
- namespace-based multi-tenancy (G, O, D, U)
- short hash identifiers (PREFIX-HASH, e.g. ROL-92AF, PRV-81F3)
- event-driven integration (domain.entity.action)
- service isolation

## Dependencies

Allowed dependencies:

- identity platform (JWT validation)
- messaging platform (Kafka)

Forbidden dependencies:

- direct database access to other services
- cross-service code imports

## Platform Dependencies

Upstream services:
- zorbit-identity (JWT validation, user context)
- zorbit-messaging (Kafka event bus)

Downstream consumers:
- All platform services that need authorization checks
- zorbit-admin-console (role/privilege management UI)
- zorbit-audit (authorization events)

## Repository Structure

- /src/api — route definitions
- /src/controllers — request handlers
- /src/services — business logic
- /src/models — database entities and DTOs
- /src/events — event publishers and consumers
- /src/middleware — JWT, namespace, logging middleware
- /src/config — configuration module
- /tests — unit and integration tests

## Running Locally

```bash
npm install
cp .env.example .env
docker-compose up -d  # PostgreSQL + Kafka
npm run migration:run
npm run start:dev
```

## Events Published

- authorization.role.created
- authorization.role.updated
- authorization.role.deleted
- authorization.privilege.assigned
- authorization.privilege.revoked
- authorization.policy.evaluated

## Events Consumed

- identity.user.created
- identity.organization.created

## API Endpoints

- GET /api/v1/O/:orgId/roles — List roles in an organization
- POST /api/v1/O/:orgId/roles — Create a role
- GET /api/v1/O/:orgId/roles/:roleId — Get a role
- PUT /api/v1/O/:orgId/roles/:roleId — Update a role
- DELETE /api/v1/O/:orgId/roles/:roleId — Delete a role
- POST /api/v1/O/:orgId/roles/:roleId/privileges — Assign privilege to role
- DELETE /api/v1/O/:orgId/roles/:roleId/privileges/:privilegeId — Revoke privilege from role
- POST /api/v1/O/:orgId/users/:userId/roles — Assign role to user
- DELETE /api/v1/O/:orgId/users/:userId/roles/:roleId — Remove role from user
- POST /api/v1/G/authorize — Evaluate an authorization policy decision

## Development Guidelines

Follow Zorbit architecture rules.
