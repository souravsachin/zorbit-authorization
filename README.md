# zorbit-authorization

Authorization service for the Zorbit platform providing RBAC, privilege management, and policy enforcement.

Handles role management, privilege assignment, user-role mapping, and authorization policy evaluation for all platform services.

See [CLAUDE.md](./CLAUDE.md) for full service documentation.

## Quick Start

```bash
npm install
cp .env.example .env
docker-compose up -d
npm run migration:run
npm run start:dev
```

The service runs on port 3002 by default.
