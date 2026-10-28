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
just test-coverage      # Same suite under c8; report copied out to backend/coverage/ (what CI runs)
```

This spins up test databases (MySQL, PostgreSQL, MSSQL, Oracle, MongoDB, DynamoDB) via `docker-compose.tst.yml`.

### Backend test coverage

`just test-coverage` runs the same compose stack with `TEST_SCRIPT=test-all-parallel:coverage`, i.e. the
AVA suite under [c8](https://github.com/bcoe/c8) (V8 native coverage, no instrumented build). `backend/.c8rc.json`
counts every file under `backend/src/` whether loaded or not (`all: true`) except `main.ts`, `migrations/` and
`*.spec.ts`; the suite executes `dist/src/**/*.js`, so `exclude-after-remap` is set for the patterns to match the
source paths the `.js.map` files point back to (`shared-code` is outside `src/` and is not counted). The container
runs as `appuser`, which is why the `Dockerfile` pre-creates `/app/backend/coverage`. The recipe copies
`coverage-summary.json`, `lcov.info` and `lcov-report/` (per-file HTML) out of the stopped container to
`backend/coverage/` (git-ignored) — only those, because `coverage/tmp` holds ~1 GB of raw V8 dumps.

CI (`.github/workflows/backend.yml`): the `test` job runs `just test-coverage`, writes a lines / statements /
functions / branches table to the job summary (`scripts/coverage-report.mjs markdown`) and uploads
`coverage-backend` as an artifact; on push to `main` the `coverage-badge` job writes the metrics table that the
top of `README.md` links to (plus an SVG badge, `scripts/coverage-report.mjs`) and force-pushes it to the orphan
`badges` branch using the workflow's own `GITHUB_TOKEN` — no external service or secret. A link rather than an
embedded image: the image is broken until that branch exists. No minimum coverage is enforced; a gate is
`"check-coverage": true` plus `"lines": <percent>` in `backend/.c8rc.json`.

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

## Writing rules (ASD-STE100)

New prose in code comments follows ASD-STE100, Simplified Technical English. The rules and the word list: `../sitenova/architecture-design-records/STE100-WRITING-RULES.md`. When the sibling checkout is absent, the rules in this section are the contract. The checker: `node scripts/ste-check.mjs <file>` (`--help` lists the modes). A Claude Code hook runs the checker after each `Write` and `Edit`. Fix every error it reports before you continue.

The core rules:

- One idea per sentence. 25 words or fewer in a description, 20 or fewer in an instruction.
- Active voice, simple present or simple past. Name the actor. No perfect tenses. No `-ing` verb forms: write `before you run`, not `before running`.
- No dash between two ideas. Write two sentences. Keep parentheses for a short reference such as `(plan 61)`.
- Approved words only: `use` not `utilize`, `make sure` not `ensure`, `through` not `via`, `but` not `however`, `for example` not `e.g.`. No contractions.
- Technical names and technical verbs are fine: identifiers in backticks, product names, `deploy`, `merge`, `upsert`.
- Existing text stays as it is. When you change a paragraph, rewrite that paragraph. Do not rewrite a document only for style.
- Out of scope: model prompts, UI strings, log and error messages, test names.
- Plans and architecture records live in the `sitenova` repository. The same rules apply there.
