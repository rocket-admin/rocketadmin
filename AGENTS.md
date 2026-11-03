# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RocketAdmin is a database administration panel that allows users to manage database connections, tables, and data. It consists of multiple components in a monorepo structure:

- **backend/** - NestJS API server (TypeScript, ES modules)
- **frontend/** - Vue 3 web application (Vite, Pinia, vue-router)
- **rocketadmin-agent/** - NestJS agent for connecting to databases behind firewalls
- **autoadmin-ws-server/** - WebSocket server for agent communication
- **shared-code/** - Shared data access layer and utilities used by backend and agent

## Development Commands

### Backend

```bash
cd backend
pnpm start:dev          # Start dev server with hot reload
pnpm build              # Build for production
pnpm lint               # ESLint with auto-fix
pnpm test               # Run non-saas AVA tests (serial)
pnpm test-all           # Run all AVA tests (5min timeout, serial)
pnpm test-saas          # Run SaaS-specific tests
```

### Frontend

```bash
cd frontend
pnpm install            # Installed on its own, not as a workspace member
pnpm dev                # Start Vite dev server (proxies /api)
pnpm build              # Production build (pnpm build:saas for SaaS)
pnpm lint               # biome + eslint-plugin-vue
pnpm typecheck          # vue-tsc
pnpm test:ci            # Vitest (unit and component tests)
pnpm test:e2e           # Playwright against a mocked API
```

### Running Backend Tests with Docker

The project uses `just` for test orchestration:

```bash
just test               # Run all backend tests with Docker Compose
just test "path/to/test.ts"  # Run specific test file
```

This spins up test databases (MySQL, PostgreSQL, MSSQL, Oracle, MongoDB, DynamoDB) via `docker-compose.tst.yml`.

### Migrations

```bash
cd backend
pnpm build              # Must build first
pnpm migration:generate src/migrations/MigrationName  # Generate migration
pnpm migration:run      # Run pending migrations
pnpm migration:revert   # Revert last migration
```

## Architecture

### Monorepo Structure

- Uses pnpm workspaces with packages: `backend`, `rocketadmin-agent`, `shared-code`
- `shared-code` is imported as `@rocketadmin/shared-code` workspace dependency
- Frontend is a separate pnpm project with its own lockfile (not a workspace member)

### Backend (NestJS)

- **Entities pattern**: Each entity has its own directory under `src/entities/` containing:
  - `*.entity.ts` - TypeORM entity
  - `*.module.ts` - NestJS module
  - `*.controller.ts` - REST endpoints
  - `*.service.ts` - Business logic (use cases)
  - `dto/` - Request/response DTOs with class-validator decorators
  - `*.controller.ee.ts` - Enterprise edition controllers (SaaS features)
- **Guards**: Authentication and authorization in `src/guards/`
- **Data access**: Uses `shared-code` for database operations via Knex
- **Testing**: AVA test framework with tests in `test/ava-tests/`
  - `non-saas-tests/` - Core functionality tests
  - `saas-tests/` - SaaS-specific feature tests
  - `complex-table-tests/` - Complex table operation tests

### Frontend (Vue 3)

See `frontend/CLAUDE.md` for detailed frontend architecture and conventions.

Key points:
- `<script setup lang="ts">` components, Composition API, composables for shared logic
- Pinia setup stores; TanStack Vue Query for cached server data
- UI primitives in `src/components/ui/` (SiteNova design system); colours only via `--color-*` variables, BEM class names
- Multi-environment builds via Vite modes (development, production, saas, saas-production)
- Vitest + @vue/test-utils for unit tests, Playwright for e2e

### Shared Code

Located in `shared-code/src/`:
- `data-access-layer/` - Database abstraction supporting MySQL, PostgreSQL, MSSQL, Oracle, MongoDB, DynamoDB, Cassandra, Elasticsearch
- `knex-manager/` - Knex connection management
- `caching/` - LRU cache utilities
- `helpers/` - Shared utilities

### Agent Architecture

The rocketadmin-agent connects to databases in private networks:
1. Agent runs inside customer's network
2. Connects to `autoadmin-ws-server` via WebSocket
3. Backend communicates with agent through WebSocket server
4. Agent executes database queries and returns results

## Database Support

The application supports: MySQL, PostgreSQL, MongoDB, DynamoDB, Cassandra, OracleDB, MSSQL, Elasticsearch, Redis

Database-specific DAOs are in `shared-code/src/data-access-layer/`.

## Testing Database Connections

Test databases are defined in `docker-compose.tst.yml`:
- MySQL: `testMySQL-e2e-testing:3306`
- PostgreSQL: `testPg-e2e-testing:5432`
- MSSQL: `mssql-e2e-testing:1433`
- Oracle: `test-oracle-e2e-testing:1521`
- MongoDB: `test-mongo-e2e-testing:27017`
- DynamoDB: `test-dynamodb-e2e-testing:8000`

## Coding Conventions

### Class Member Ordering

- Private methods must be placed at the end of the class, after all public methods
