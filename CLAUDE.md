# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RocketAdmin is a database administration panel that allows users to manage database connections, tables, and data. It consists of multiple components in a monorepo structure:

- **backend/** - NestJS API server (TypeScript, ES modules)
- **frontend/** - Angular 19 web application (standalone components)
- **rocketadmin-agent/** - NestJS agent for connecting to databases behind firewalls
- **autoadmin-ws-server/** - WebSocket server for agent communication
- **shared-code/** - Shared data access layer and utilities used by backend and agent

## Development Commands

### Backend

```bash
cd backend
yarn start:dev          # Start dev server with hot reload
yarn build              # Build for production
yarn lint               # ESLint with auto-fix
yarn test               # Run non-saas AVA tests (serial)
yarn test-all           # Run all AVA tests (5min timeout, serial)
yarn test-saas          # Run SaaS-specific tests
```

### Frontend

```bash
cd frontend
yarn start              # Start Angular dev server
yarn build              # Production build
yarn test:ci            # Run tests headlessly (CI mode)
yarn test --browsers=ChromeHeadlessCustom --no-watch --no-progress  # Headless tests
yarn lint               # TSLint (deprecated, needs ESLint migration)
```

### Running Backend Tests with Docker

The project uses `just` for test orchestration:

```bash
just test               # Run all backend tests with Docker Compose
just test "path/to/test.ts"  # Run specific test file
```

This spins up test databases (MySQL, PostgreSQL, MSSQL, Oracle, IBM DB2, MongoDB, DynamoDB) via `docker-compose.tst.yml`.

### Migrations

```bash
cd backend
yarn build              # Must build first
yarn migration:generate src/migrations/MigrationName  # Generate migration
yarn migration:run      # Run pending migrations
yarn migration:revert   # Revert last migration
```

## Architecture

### Monorepo Structure

- Uses Yarn workspaces with packages: `backend`, `rocketadmin-agent`, `shared-code`
- `shared-code` is imported as `@rocketadmin/shared-code` workspace dependency
- Frontend is a separate Angular project (not a workspace member)

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

### Frontend (Angular 19)

See `frontend/CLAUDE.md` for detailed frontend architecture.

Key points:
- Standalone components (no NgModules)
- BehaviorSubject-based state management (no NgRx)
- Multi-environment builds (development, production, saas, saas-production)
- Jasmine/Karma testing with ChromeHeadless

### Shared Code

Located in `shared-code/src/`:
- `data-access-layer/` - Database abstraction supporting MySQL, PostgreSQL, MSSQL, Oracle, MongoDB, DynamoDB, IBM DB2, Cassandra, Elasticsearch
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

The application supports: MySQL, PostgreSQL, MongoDB, DynamoDB, Cassandra, OracleDB, MSSQL, IBM DB2, Elasticsearch, Redis

Database-specific DAOs are in `shared-code/src/data-access-layer/`.

## Testing Database Connections

Test databases are defined in `docker-compose.tst.yml`:
- MySQL: `testMySQL-e2e-testing:3306`
- PostgreSQL: `testPg-e2e-testing:5432`
- MSSQL: `mssql-e2e-testing:1433`
- Oracle: `test-oracle-e2e-testing:1521`
- IBM DB2: `test-ibm-db2-e2e-testing:50000`
- MongoDB: `test-mongo-e2e-testing:27017`
- DynamoDB: `test-dynamodb-e2e-testing:8000`
