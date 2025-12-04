# Secret Storage Feature Specification

**Version:** 1.0
**Date:** 2025-11-21
**Status:** Draft

## Table of Contents
1. [Overview](#overview)
2. [Goals and Objectives](#goals-and-objectives)
3. [Functional Requirements](#functional-requirements)
4. [Technical Design](#technical-design)
5. [Database Schema](#database-schema)
6. [API Specification](#api-specification)
7. [Security Design](#security-design)
8. [Frontend Requirements](#frontend-requirements)
9. [Implementation Phases](#implementation-phases)
10. [Testing Strategy](#testing-strategy)
11. [Migration and Rollout](#migration-and-rollout)
12. [Future Enhancements](#future-enhancements)

---

## Overview

### Context
RocketAdmin is a multi-database administration panel that currently stores encrypted database connection credentials. Users need a simple way to store and manage other sensitive information (API keys, tokens, certificates, passwords) related to their company's database work.

### Problem Statement
Users currently have no secure way to:
- Store API keys for external services they use with their databases
- Manage authentication tokens needed for integrations
- Store certificates and encryption keys
- Audit access to sensitive information

### Proposed Solution
Implement a simple, encrypted secret storage system that allows users to securely store, manage, and audit access to sensitive company information, leveraging RocketAdmin's existing encryption infrastructure.

---

## Goals and Objectives

### Primary Goals
1. **Secure Storage**: Provide military-grade encryption for company secrets
2. **User Experience**: Make secret management intuitive and seamless
3. **Access Control**: Company-based access only
4. **Audit Trail**: Track all access and modifications to secrets
5. **Integration**: Leverage existing encryption and authentication infrastructure

### Success Criteria
- Users can create, read, update, and delete company secrets
- Secrets are encrypted at rest using existing infrastructure
- Master password protection available (optional)
- All secret access is logged
- Frontend provides intuitive UI similar to connection management
- Zero data breaches or unauthorized access incidents

### Non-Goals (Out of Scope for v1)
- External vault integration (AWS Secrets Manager, HashiCorp Vault)
- Secret rotation automation
- Secret generators
- Secret versioning with full history
- Secret templates
- Bulk import/export
- User-to-user secret sharing
- Tags and categorization
- Secret types/categories

---

## Functional Requirements

### FR-1: Secret CRUD Operations

#### FR-1.1: Create Secret
- **Actor**: Authenticated user
- **Preconditions**: User is logged in and belongs to a company
- **Flow**:
  1. User navigates to secrets page
  2. User clicks "Add Secret"
  3. User fills in secret details (slug, value)
  4. User optionally enables master password protection
  5. System validates input
  6. System encrypts secret
  7. System saves secret to database linked to user's company
  8. System logs creation event
- **Postconditions**: Secret is stored encrypted in database and associated with company
- **Validations**:
  - Slug: 1-255 characters, letters (uppercase/lowercase), numbers, hyphens, underscores only, unique per company, required
  - Value: 1-10000 characters, required
  - Master password: If enabled, 8+ characters

#### FR-1.2: Read Secret
- **Actor**: Authenticated user in the same company
- **Preconditions**: User belongs to the same company as the secret
- **Flow**:
  1. User navigates to secrets page
  2. User sees list of company secrets (slug only)
  3. User clicks on secret to view details
  4. If master password protected, system prompts for master password
  5. System validates user is in same company
  6. System decrypts secret
  7. System displays secret value (initially masked)
  8. User clicks "reveal" to show value
  9. System logs access event
- **Postconditions**: Secret access is logged
- **Security**:
  - Secret value initially masked (****)
  - Master password required if enabled
  - Access logged with timestamp, IP, user agent

#### FR-1.3: Update Secret
- **Actor**: Authenticated user (company member)
- **Preconditions**: User belongs to the same company as the secret
- **Flow**:
  1. User opens secret details
  2. User clicks "Edit"
  3. User modifies fields (can change value only, slug is immutable)
  4. User saves changes
  5. System validates input
  6. System re-encrypts secret (if value changed)
  7. System updates database
  8. System logs update event
- **Postconditions**: Secret is updated, audit log created
- **Validations**: Value: 1-10000 characters, required

#### FR-1.4: Delete Secret
- **Actor**: Authenticated user (company member)
- **Preconditions**: User belongs to the same company as the secret
- **Flow**:
  1. User opens secret details
  2. User clicks "Delete"
  3. System prompts for confirmation
  4. User confirms deletion
  5. System permanently deletes secret from database
  6. System logs deletion event (before deletion)
- **Postconditions**: Secret is permanently deleted, audit log preserved
- **Security**: Any company member can delete company secrets

### FR-2: Search Secrets

#### FR-2.1: Search Secrets
- **Actor**: Authenticated user
- **Preconditions**: User is logged in
- **Flow**:
  1. User enters search query
  2. System searches slug only
  3. System returns matching secrets from user's company
- **Postconditions**: Filtered list displayed

### FR-3: Secret Expiration

#### FR-3.1: Set Secret Expiration
- **Actor**: Secret creator
- **Preconditions**: User created the secret
- **Flow**:
  1. User opens secret details
  2. User enables expiration
  3. User sets expiration date
  4. System saves expiration date
- **Postconditions**: Secret has expiration date
- **Validations**: Date must be in future

#### FR-3.2: Handle Expired Secrets
- **Actor**: System (background job)
- **Preconditions**: N/A
- **Flow**:
  1. System runs daily job
  2. System finds secrets with expires_at < now
  3. System marks secrets as expired
  4. System sends notification to creator
- **Postconditions**: Expired secrets cannot be accessed
- **Behavior**: Expired secrets cannot be viewed until creator extends expiration

### FR-4: Audit Logging

#### FR-4.1: Log All Access
- **Actor**: System
- **Preconditions**: Any secret operation occurs
- **Flow**:
  1. User performs action (view, copy, update, delete)
  2. System captures event details
  3. System writes to audit log
- **Postconditions**: Audit record created
- **Logged Data**:
  - Timestamp
  - User ID
  - Secret ID
  - Action type
  - IP address
  - User agent
  - Success/failure

#### FR-4.2: View Audit Log
- **Actor**: Authenticated user (company member)
- **Preconditions**: User belongs to the same company as the secret
- **Flow**:
  1. User opens secret details
  2. User clicks "Audit Log" tab
  3. System displays access history
- **Postconditions**: User sees who accessed secret and when

---

## Technical Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (Angular)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Secrets List │  │Secret Details│  │ Share Dialog │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │ HTTPS/JWT
┌─────────────────────────────────────────────────────────────┐
│                      Backend (NestJS)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Secrets Module                          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │  │
│  │  │   Controller │  │    Service   │  │Repository │  │  │
│  │  └──────────────┘  └──────────────┘  └───────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Encryptor Service (Existing)            │  │
│  │  - encryptData()                                     │  │
│  │  - decryptData()                                     │  │
│  │  - encryptDataMasterPwd()                            │  │
│  │  - decryptDataMasterPwd()                            │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Authorization Guards (Existing)              │  │
│  │  - JwtAuthGuard                                      │  │
│  │  - SecretAccessGuard (New)                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL Database (TypeORM)                   │
│  ┌───────────────┐  ┌──────────────────┐  ┌──────────────┐│
│  │UserSecretEntity│  │SharedSecretEntity│  │SecretAccess  ││
│  │               │  │                  │  │LogEntity     ││
│  └───────────────┘  └──────────────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Module Structure

```
backend/src/
├── entities/
│   ├── user-secret/
│   │   ├── user-secret.entity.ts
│   │   ├── user-secret.interface.ts
│   │   └── use-cases/
│   │       ├── create-user-secret.use.case.ts
│   │       ├── update-user-secret.use.case.ts
│   │       ├── delete-user-secret.use.case.ts
│   │       ├── find-user-secrets.use.case.ts
│   │       ├── share-secret.use.case.ts
│   │       └── revoke-secret-access.use.case.ts
│   ├── shared-secret/
│   │   ├── shared-secret.entity.ts
│   │   └── shared-secret.interface.ts
│   └── secret-access-log/
│       ├── secret-access-log.entity.ts
│       └── secret-access-log.interface.ts
├── modules/
│   └── secrets/
│       ├── secrets.module.ts
│       ├── secrets.controller.ts
│       ├── secrets.service.ts
│       ├── dto/
│       │   ├── create-secret.dto.ts
│       │   ├── update-secret.dto.ts
│       │   ├── share-secret.dto.ts
│       │   └── find-secrets.dto.ts
│       └── guards/
│           └── secret-access.guard.ts
└── migrations/
    ├── TIMESTAMP-CreateUserSecretEntity.ts
    ├── TIMESTAMP-CreateSharedSecretEntity.ts
    └── TIMESTAMP-CreateSecretAccessLogEntity.ts
```

### Data Flow

#### Creating a Secret
```
1. User submits form → Frontend validates
2. Frontend sends POST /secrets with encrypted master password (if enabled)
3. SecretsController receives request
4. JwtAuthGuard validates authentication
5. SecretsService.createSecret() called
6. Encryptor.encryptData(value) encrypts with PRIVATE_KEY
7. If master password: Encryptor.encryptDataMasterPwd() double-encrypts
8. UserSecretEntity created and saved
9. SecretAccessLogEntity created (action: CREATE)
10. Response sent to frontend (secret without value)
```

#### Reading a Secret
```
1. User clicks secret → Frontend requests GET /secrets/:id
2. If master password required, frontend prompts and sends in header
3. SecretsController receives request
4. JwtAuthGuard validates authentication
5. SecretAccessGuard validates permissions
6. SecretsService.findSecretById() called
7. Entity loaded from database
8. If master password: validate hash, decrypt with master password
9. Decrypt with PRIVATE_KEY
10. SecretAccessLogEntity created (action: VIEW)
11. Response sent with decrypted value
```

#### Sharing a Secret
```
1. Owner clicks "Share" → Selects recipient and permissions
2. Frontend sends POST /secrets/:id/share
3. SecretsController receives request
4. Validates owner permission
5. Validates recipient exists
6. SharedSecretEntity created
7. SecretAccessLogEntity created (action: SHARE)
8. Notification sent to recipient
9. Response confirms sharing
```

---

## Database Schema

### UserSecretEntity

```typescript
@Entity('user_secrets')
@Index(['companyId', 'slug'], { unique: true })
export class UserSecretEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CompanyInfoEntity)
  @JoinColumn()
  company: CompanyInfoEntity;

  @Column()
  @Index()
  companyId: string;

  @Column({ type: 'varchar', length: 255 })
  slug: string;

  @Column({ type: 'text' })
  encryptedValue: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ default: false })
  masterEncryption: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  masterHash: string;

  @OneToMany(() => SecretAccessLogEntity, (log) => log.secret)
  accessLogs: SecretAccessLogEntity[];

  @BeforeInsert()
  @BeforeUpdate()
  encryptCredentials() {
    // Encrypt value with PRIVATE_KEY
    if (this.encryptedValue && !this.masterEncryption) {
      this.encryptedValue = Encryptor.encryptData(this.encryptedValue);
    }
  }

  @AfterLoad()
  decryptCredentials() {
    // Decrypt value with PRIVATE_KEY
    if (this.encryptedValue && !this.masterEncryption) {
      this.encryptedValue = Encryptor.decryptData(this.encryptedValue);
    }
  }
}
```

### SecretAccessLogEntity

```typescript
@Entity('secret_access_logs')
export class SecretAccessLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserSecretEntity, (secret) => secret.accessLogs)
  @JoinColumn()
  secret: UserSecretEntity;

  @Column()
  @Index()
  secretId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn()
  user: UserEntity;

  @Column()
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: SecretActionEnum,
  })
  action: SecretActionEnum;

  @CreateDateColumn()
  @Index()
  accessedAt: Date;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @Column({ default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;
}

export enum SecretActionEnum {
  CREATE = 'create',
  VIEW = 'view',
  COPY = 'copy',
  UPDATE = 'update',
  DELETE = 'delete',
}
```

### Database Indexes

```sql
-- Performance indexes
CREATE INDEX idx_user_secrets_company_id ON user_secrets(company_id);
CREATE INDEX idx_user_secrets_created_at ON user_secrets(created_at);
CREATE INDEX idx_user_secrets_expires_at ON user_secrets(expires_at);
CREATE UNIQUE INDEX idx_user_secrets_company_slug ON user_secrets(company_id, slug);

CREATE INDEX idx_secret_access_logs_secret_id ON secret_access_logs(secret_id);
CREATE INDEX idx_secret_access_logs_user_id ON secret_access_logs(user_id);
CREATE INDEX idx_secret_access_logs_accessed_at ON secret_access_logs(accessed_at);
```

---

## API Specification

### Base Path
All endpoints under: `/api/secrets`

### Authentication
All endpoints require JWT authentication via `Authorization: Bearer <token>` header or `rocketadmin_cookie` cookie.

### Master Password Header
When master password is enabled for a secret: `masterpwd: <plain_password>`

### Endpoints

#### 1. Create Secret
```http
POST /api/secrets
Content-Type: application/json
Authorization: Bearer <jwt>
masterpwd: <password> (optional)

{
  "slug": "aws-api-key",
  "value": "AKIAIOSFODNN7EXAMPLE",
  "expiresAt": "2026-12-31T23:59:59Z",
  "masterEncryption": true,
  "masterPassword": "MyStrongPassword123!"
}

Response: 201 Created
{
  "id": "uuid",
  "slug": "aws-api-key",
  "createdAt": "2025-11-21T10:00:00Z",
  "updatedAt": "2025-11-21T10:00:00Z",
  "expiresAt": "2026-12-31T23:59:59Z",
  "masterEncryption": true,
  "companyId": "company-uuid"
}

Error: 409 Conflict (if slug already exists in company)
{
  "statusCode": 409,
  "message": "Secret with this slug already exists in your company",
  "error": "Conflict"
}
```

#### 2. Get All Secrets (List)
```http
GET /api/secrets?page=1&limit=20&search=aws
Authorization: Bearer <jwt>

Response: 200 OK
{
  "data": [
    {
      "id": "uuid",
      "slug": "aws-api-key",
      "createdAt": "2025-11-21T10:00:00Z",
      "updatedAt": "2025-11-21T10:00:00Z",
      "lastAccessedAt": "2025-11-21T11:30:00Z",
      "expiresAt": "2026-12-31T23:59:59Z",
      "masterEncryption": true,
      "createdBy": {
        "id": "user-uuid",
        "email": "user@example.com",
        "name": "John Doe"
      }
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

#### 3. Get Secret by Slug
```http
GET /api/secrets/:slug
Authorization: Bearer <jwt>
masterpwd: <password> (if master encryption enabled)

Response: 200 OK
{
  "id": "uuid",
  "slug": "aws-api-key",
  "value": "AKIAIOSFODNN7EXAMPLE",
  "createdAt": "2025-11-21T10:00:00Z",
  "updatedAt": "2025-11-21T10:00:00Z",
  "lastAccessedAt": "2025-11-21T11:30:00Z",
  "expiresAt": "2026-12-31T23:59:59Z",
  "masterEncryption": true,
  "companyId": "company-uuid",
  "createdBy": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}

Error: 403 Forbidden (if master password required but not provided or incorrect)
{
  "statusCode": 403,
  "message": "Master password required",
  "error": "Forbidden"
}
```

#### 4. Update Secret
```http
PUT /api/secrets/:slug
Content-Type: application/json
Authorization: Bearer <jwt>
masterpwd: <old_password> (if currently encrypted)

{
  "value": "NEWAKIAIOSFODNN7EXAMPLE",
  "expiresAt": "2027-12-31T23:59:59Z"
}

Response: 200 OK
{
  "id": "uuid",
  "slug": "aws-api-key",
  "updatedAt": "2025-11-21T12:00:00Z",
  "expiresAt": "2027-12-31T23:59:59Z"
}
```

#### 5. Delete Secret
```http
DELETE /api/secrets/:slug
Authorization: Bearer <jwt>

Response: 200 OK
{
  "message": "Secret deleted successfully",
  "deletedAt": "2025-11-21T12:30:00Z"
}

Error: 403 Forbidden (if not company member)
{
  "statusCode": 403,
  "message": "You don't have permission to delete this secret",
  "error": "Forbidden"
}
```

#### 6. Get Secret Audit Log
```http
GET /api/secrets/:slug/audit-log?page=1&limit=50
Authorization: Bearer <jwt>

Response: 200 OK
{
  "data": [
    {
      "id": "log-uuid",
      "action": "view",
      "user": {
        "id": "user-uuid",
        "email": "user@example.com",
        "name": "John Doe"
      },
      "accessedAt": "2025-11-21T11:30:00Z",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "success": true
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```

### Error Responses

```http
400 Bad Request - Validation error
{
  "statusCode": 400,
  "message": ["slug should not be empty", "slug must match pattern ^[a-zA-Z0-9_-]+$", "value should not be empty"],
  "error": "Bad Request"
}

401 Unauthorized - Not authenticated
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}

403 Forbidden - No permission
{
  "statusCode": 403,
  "message": "You don't have permission to access this secret",
  "error": "Forbidden"
}

404 Not Found - Secret not found
{
  "statusCode": 404,
  "message": "Secret not found",
  "error": "Not Found"
}

409 Conflict - Slug already exists
{
  "statusCode": 409,
  "message": "Secret with this slug already exists in your company",
  "error": "Conflict"
}

410 Gone - Secret expired
{
  "statusCode": 410,
  "message": "Secret has expired",
  "error": "Gone"
}
```

---

## Security Design

### Encryption Architecture

#### Layer 1: Base Encryption (Always Active)
- **Algorithm**: AES-256
- **Key**: `PRIVATE_KEY` environment variable (64+ characters)
- **Implementation**: `Encryptor.encryptData(value)`
- **Applied**: All secret values encrypted at rest
- **Lifecycle**: Encrypted on `@BeforeInsert/@BeforeUpdate`, decrypted on `@AfterLoad`

#### Layer 2: Master Password Encryption (Optional)
- **Algorithm**: AES-256
- **Key**: User-provided master password
- **Implementation**: `Encryptor.encryptDataMasterPwd(value, masterPwd)`
- **Applied**: When user enables `masterEncryption` flag
- **Validation**: Master password hash stored in `masterHash` field (PBKDF2)
- **Process**: Value encrypted with master password FIRST, then with PRIVATE_KEY

#### Encryption Flow
```
Plain Value → [Master Password Encrypt] → [PRIVATE_KEY Encrypt] → Stored in DB

Retrieval:
Stored Value → [PRIVATE_KEY Decrypt] → [Master Password Decrypt] → Plain Value
```

### Access Control

#### Permission Matrix

| Action | Company Member | Non-member |
|--------|----------------|------------|
| View   | ✓              | ✗          |
| Edit   | ✓              | ✗          |
| Delete | ✓              | ✗          |
| Audit  | ✓              | ✗          |

#### SecretAccessGuard Implementation

```typescript
@Injectable()
export class SecretAccessGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // From JWT
    const slug = request.params.slug;

    // Load secret by slug and company
    const secret = await this.secretsRepository.findOne({
      where: { slug, companyId: user.companyId },
      relations: ['company'],
    });

    if (!secret) {
      throw new NotFoundException('Secret not found');
    }

    // Check expiration
    if (secret.expiresAt && secret.expiresAt < new Date()) {
      throw new GoneException('Secret has expired');
    }

    // All company members have full access
    return true;
  }
}
```

### Audit Logging

#### Log Creation Service

```typescript
@Injectable()
export class SecretAuditService {
  async logAccess(
    secretId: string,
    userId: string,
    action: SecretActionEnum,
    request: Request,
    success: boolean = true,
    errorMessage?: string,
  ): Promise<void> {
    const log = new SecretAccessLogEntity();
    log.secretId = secretId;
    log.userId = userId;
    log.action = action;
    log.accessedAt = new Date();
    log.ipAddress = this.getClientIp(request);
    log.userAgent = request.headers['user-agent'];
    log.success = success;
    log.errorMessage = errorMessage;

    await this.secretAccessLogRepository.save(log);

    // Update lastAccessedAt on secret for VIEW actions
    if (action === SecretActionEnum.VIEW && success) {
      await this.secretRepository.update(secretId, {
        lastAccessedAt: new Date(),
      });
    }
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }
}
```

### Master Password Security

#### Frontend Handling (CRITICAL CHANGE)
**Current Problem**: Master passwords stored in localStorage (vulnerable to XSS)

**Solution**:
1. **Never store master passwords in localStorage**
2. **Session-only storage**:
   ```typescript
   // Store in memory only (component state)
   private masterPasswords: Map<string, { password: string; expiresAt: Date }> = new Map();

   // Or use sessionStorage with auto-clear
   sessionStorage.setItem(`master_${secretId}`, password);
   // Clear after 15 minutes
   setTimeout(() => {
     sessionStorage.removeItem(`master_${secretId}`);
   }, 15 * 60 * 1000);
   ```

3. **Re-prompt after timeout**:
   - Store timestamp of last entry
   - Require re-entry after 15 minutes
   - Clear on browser close (sessionStorage)

4. **Optional: "Remember for session" checkbox**:
   - User must explicitly opt-in
   - Still clears on browser close
   - Never persist to localStorage

#### Backend Validation

```typescript
async validateMasterPassword(
  secret: UserSecretEntity,
  providedPassword: string,
): Promise<boolean> {
  if (!secret.masterEncryption) {
    return true;
  }

  if (!providedPassword) {
    throw new ForbiddenException('Master password required');
  }

  const passwordValid = Encryptor.verifyUserPassword(
    providedPassword,
    secret.masterHash,
  );

  if (!passwordValid) {
    // Log failed attempt
    await this.auditService.logAccess(
      secret.id,
      'current-user-id',
      SecretActionEnum.VIEW,
      request,
      false,
      'Invalid master password',
    );
    throw new ForbiddenException('Invalid master password');
  }

  return true;
}
```

### Rate Limiting

Apply rate limits to prevent brute force attacks on master passwords:

```typescript
@Controller('secrets')
@UseGuards(JwtAuthGuard)
export class SecretsController {
  @Get(':id')
  @Throttle(10, 60) // 10 requests per 60 seconds
  async findOne(
    @Param('id') id: string,
    @Headers('masterpwd') masterPwd: string,
  ) {
    // ...
  }
}
```

### Input Sanitization

```typescript
export class CreateSecretDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'slug must contain only letters, numbers, hyphens, and underscores'
  })
  @Transform(({ value }) => value.trim())
  slug: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(10000)
  value: string; // Don't trim (may be intentional whitespace)

  @IsOptional()
  @IsISO8601()
  @IsDateInFuture()
  expiresAt?: string;

  @IsBoolean()
  @IsOptional()
  masterEncryption?: boolean;

  @IsString()
  @IsOptional()
  @MinLength(8)
  @ValidateIf((o) => o.masterEncryption === true)
  masterPassword?: string;
}
```

### SQL Injection Prevention
- **TypeORM** handles parameterization automatically
- Never use raw queries with user input
- Use QueryBuilder for complex queries

### XSS Prevention
- Frontend sanitizes all output using Angular's built-in DomSanitizer
- Content-Security-Policy headers set
- Secret values displayed in `<pre>` tags or `<input type="password">`

---

## Frontend Requirements

### New Components

#### 1. Secrets List Component
**Path**: `frontend/src/app/components/secrets/secrets-list/secrets-list.component.ts`

**Features**:
- Displays company secrets in table/card view
- Columns: Slug, Last Accessed, Expires, Actions
- Search bar (filters by slug only)
- Pagination
- Action buttons: View, Edit, Delete (all available to company members)

#### 2. Secret Details Component
**Path**: `frontend/src/app/components/secrets/secret-details/secret-details.component.ts`

**Features**:
- Displays secret metadata
- Secret value initially masked (****)
- "Reveal" button to show value
- "Copy to Clipboard" button with auto-clear after 30 seconds
- Master password prompt dialog (if required)
- Edit mode (available to all company members)
- Audit log tab showing access history (available to all company members)

#### 3. Create/Edit Secret Dialog
**Path**: `frontend/src/app/components/secrets/secret-form-dialog/secret-form-dialog.component.ts`

**Features**:
- Form fields: Slug (disabled on edit), Value
- Slug validation (letters, numbers, hyphens, underscores only)
- Master password toggle
- Master password input (confirmation required)
- Expiration date picker
- Validation error display

#### 4. Master Password Prompt Dialog
**Path**: `frontend/src/app/components/secrets/master-password-prompt/master-password-prompt.component.ts`

**Features**:
- Password input field
- "Remember for session" checkbox (stores in sessionStorage)
- Cancel/Submit buttons
- Error message display

#### 5. Audit Log Component
**Path**: `frontend/src/app/components/secrets/audit-log/audit-log.component.ts`

**Features**:
- Table with columns: User, Action, Timestamp, IP Address, Status
- Pagination
- Filter by action type
- Date range picker

### Navigation Updates

Add "Secrets" menu item to main navigation:
```typescript
// frontend/src/app/app-routing.module.ts
{
  path: 'secrets',
  loadChildren: () => import('./secrets/secrets.module').then(m => m.SecretsModule),
  canActivate: [AuthGuard],
}
```

### Service Layer

#### SecretsService
**Path**: `frontend/src/app/services/secrets.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class SecretsService {
  private apiUrl = '/api/secrets';

  constructor(private http: HttpClient) {}

  getSecrets(params?: SecretListParams): Observable<SecretListResponse> {
    return this.http.get<SecretListResponse>(this.apiUrl, { params });
  }

  getSecretById(id: string, masterPassword?: string): Observable<Secret> {
    const headers = masterPassword ? { masterpwd: masterPassword } : {};
    return this.http.get<Secret>(`${this.apiUrl}/${id}`, { headers });
  }

  createSecret(secret: CreateSecretDto): Observable<Secret> {
    return this.http.post<Secret>(this.apiUrl, secret);
  }

  updateSecret(id: string, secret: UpdateSecretDto, masterPassword?: string): Observable<Secret> {
    const headers = masterPassword ? { masterpwd: masterPassword } : {};
    return this.http.put<Secret>(`${this.apiUrl}/${id}`, secret, { headers });
  }

  deleteSecret(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getAuditLog(id: string, page: number = 1): Observable<AuditLogResponse> {
    return this.http.get<AuditLogResponse>(`${this.apiUrl}/${id}/audit-log`, {
      params: { page: page.toString(), limit: '50' },
    });
  }
}
```

#### MasterPasswordManager
**Path**: `frontend/src/app/services/master-password-manager.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class MasterPasswordManager {
  private passwords = new Map<string, { password: string; expiresAt: Date }>();
  private readonly TIMEOUT_MINUTES = 15;

  storePassword(secretId: string, password: string, rememberForSession: boolean): void {
    if (!rememberForSession) {
      // Store in memory only
      this.passwords.set(secretId, {
        password,
        expiresAt: new Date(Date.now() + this.TIMEOUT_MINUTES * 60 * 1000),
      });
      return;
    }

    // Store in sessionStorage (cleared on browser close)
    const data = {
      password,
      expiresAt: Date.now() + this.TIMEOUT_MINUTES * 60 * 1000,
    };
    sessionStorage.setItem(`master_${secretId}`, JSON.stringify(data));

    // Also store in memory for quick access
    this.passwords.set(secretId, {
      password,
      expiresAt: new Date(data.expiresAt),
    });
  }

  getPassword(secretId: string): string | null {
    // Check memory first
    const memoryEntry = this.passwords.get(secretId);
    if (memoryEntry && memoryEntry.expiresAt > new Date()) {
      return memoryEntry.password;
    }

    // Check sessionStorage
    const stored = sessionStorage.getItem(`master_${secretId}`);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.expiresAt > Date.now()) {
          return data.password;
        }
        // Expired, remove
        sessionStorage.removeItem(`master_${secretId}`);
      } catch (e) {
        sessionStorage.removeItem(`master_${secretId}`);
      }
    }

    // Expired or not found
    this.passwords.delete(secretId);
    return null;
  }

  clearPassword(secretId: string): void {
    this.passwords.delete(secretId);
    sessionStorage.removeItem(`master_${secretId}`);
  }

  clearAll(): void {
    this.passwords.clear();
    // Clear all master passwords from sessionStorage
    Object.keys(sessionStorage)
      .filter(key => key.startsWith('master_'))
      .forEach(key => sessionStorage.removeItem(key));
  }
}
```

### UI/UX Considerations

1. **Copy to Clipboard**:
   - Show success toast
   - Auto-clear clipboard after 30 seconds (optional)
   - Use Clipboard API with fallback

2. **Secret Value Display**:
   - Initially show as `••••••••••••`
   - "Reveal" button changes to "Hide"
   - When revealed, show in monospace font
   - Use `<input type="password">` for easy reveal/hide toggle

3. **Master Password UX**:
   - Prompt appears as modal dialog
   - Show "forgot password" hint: "Contact secret owner"
   - After 3 failed attempts, show captcha or rate limit

4. **Expiration Warnings**:
   - Show badge if expires within 7 days
   - Show different badge if expired
   - Toast notification when secret is about to expire

5. **Responsive Design**:
   - Mobile-friendly table (convert to cards)
   - Touch-friendly buttons
   - Full-screen dialogs on mobile

6. **Accessibility**:
   - ARIA labels for all interactive elements
   - Keyboard navigation support
   - Screen reader announcements
   - High contrast mode support

---

## Implementation Phases

### Phase 1: Backend Foundation (Week 1-2)
**Goal**: Core backend functionality

**Tasks**:
1. Create TypeORM entities:
   - UserSecretEntity
   - SecretAccessLogEntity
2. Create database migrations
3. Implement SecretsService with CRUD methods
4. Implement encryption/decryption using existing Encryptor
5. Implement SecretAccessGuard
6. Create SecretsController with endpoints:
   - POST /secrets
   - GET /secrets
   - GET /secrets/:id
   - PUT /secrets/:id
   - DELETE /secrets/:id
   - GET /secrets/:id/audit-log
7. Add audit logging to all operations
8. Write unit tests for service layer
9. Write e2e tests for API endpoints

**Deliverables**:
- Working API for secret CRUD
- Encrypted storage
- Company-based access control
- Audit logging
- Test coverage >80%

### Phase 2: Frontend Implementation (Week 3-4)
**Goal**: Complete user interface

**Tasks**:
1. Create Angular module and routing
2. Implement SecretsService (HTTP client)
3. Implement MasterPasswordManager
4. Create components:
   - secrets-list
   - secret-details
   - secret-form-dialog
   - master-password-prompt
   - audit-log
5. Add navigation menu item
6. Implement responsive design
7. Add loading states and error handling
8. Write frontend unit tests

**Deliverables**:
- Complete UI for all features
- Responsive design
- Error handling
- Frontend tests

### Phase 3: Polish & Testing (Week 5)
**Goal**: Final touches and production readiness

**Tasks**:
1. Implement secret expiration handling
2. Add expiration notifications
3. UI polish and refinements
4. Performance optimization
5. Security audit
6. Documentation
7. Integration testing
8. Load testing

**Deliverables**:
- Expiration system complete
- Documentation complete
- Ready for production

### Phase 4: Launch (Week 6)
**Goal**: Production deployment

**Tasks**:
1. Security penetration testing
2. User acceptance testing
3. Deploy to staging
4. Monitor and fix issues
5. Deploy to production
6. Post-launch monitoring

**Deliverables**:
- Stable production deployment
- Zero critical bugs
- Monitoring dashboards

---

## Testing Strategy

### Unit Tests

#### Backend
```typescript
// secrets.service.spec.ts
describe('SecretsService', () => {
  it('should create a secret with encryption', async () => {
    const dto = { title: 'Test', value: 'secret', secretType: 'api_key' };
    const result = await service.createSecret(dto, user);
    expect(result.encryptedValue).not.toBe('secret');
    expect(result.title).toBe('Test');
  });

  it('should decrypt secret value when loading', async () => {
    const secret = await service.findById(secretId, user);
    expect(secret.value).toBe('original_value');
  });

  it('should require master password when enabled', async () => {
    await expect(
      service.findById(secretId, user, null)
    ).rejects.toThrow('Master password required');
  });

  it('should log all access attempts', async () => {
    await service.findById(secretId, user);
    const logs = await auditService.getLogs(secretId);
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe('view');
  });
});

// secret-access.guard.spec.ts
describe('SecretAccessGuard', () => {
  it('should allow owner full access', async () => {
    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);
  });

  it('should allow shared read access', async () => {
    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);
  });

  it('should deny shared write access for read-only share', async () => {
    await expect(guard.canActivate(context)).rejects.toThrow('read-only access');
  });

  it('should deny access to non-members', async () => {
    await expect(guard.canActivate(context)).rejects.toThrow('permission');
  });
});
```

#### Frontend
```typescript
// secrets.service.spec.ts
describe('SecretsService', () => {
  it('should fetch secrets list', (done) => {
    service.getSecrets().subscribe(response => {
      expect(response.data.length).toBeGreaterThan(0);
      done();
    });
  });

  it('should send master password in header', (done) => {
    service.getSecretById('id', 'password').subscribe(() => {
      const req = httpMock.expectOne('/api/secrets/id');
      expect(req.request.headers.get('masterpwd')).toBe('password');
      done();
    });
  });
});

// master-password-manager.spec.ts
describe('MasterPasswordManager', () => {
  it('should store password in memory', () => {
    manager.storePassword('secret-id', 'password', false);
    expect(manager.getPassword('secret-id')).toBe('password');
  });

  it('should expire password after timeout', fakeAsync(() => {
    manager.storePassword('secret-id', 'password', false);
    tick(16 * 60 * 1000); // 16 minutes
    expect(manager.getPassword('secret-id')).toBeNull();
  }));

  it('should clear all passwords', () => {
    manager.storePassword('secret-1', 'password', false);
    manager.storePassword('secret-2', 'password', false);
    manager.clearAll();
    expect(manager.getPassword('secret-1')).toBeNull();
    expect(manager.getPassword('secret-2')).toBeNull();
  });
});
```

### Integration Tests

```typescript
// secrets.e2e.spec.ts
describe('Secrets API (e2e)', () => {
  it('should create, read, update, and delete secret', async () => {
    // Create
    const createResponse = await request(app.getHttpServer())
      .post('/api/secrets')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ title: 'Test Secret', value: 'secret123', secretType: 'api_key' })
      .expect(201);

    const secretId = createResponse.body.id;

    // Read
    const readResponse = await request(app.getHttpServer())
      .get(`/api/secrets/${secretId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(readResponse.body.value).toBe('secret123');

    // Update
    await request(app.getHttpServer())
      .put(`/api/secrets/${secretId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ title: 'Updated Secret', value: 'newsecret', secretType: 'api_key' })
      .expect(200);

    // Delete
    await request(app.getHttpServer())
      .delete(`/api/secrets/${secretId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
  });

  it('should enforce master password protection', async () => {
    const secretId = await createSecretWithMasterPassword('password123');

    // Should fail without password
    await request(app.getHttpServer())
      .get(`/api/secrets/${secretId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(403);

    // Should succeed with correct password
    await request(app.getHttpServer())
      .get(`/api/secrets/${secretId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('masterpwd', 'password123')
      .expect(200);
  });

  it('should allow company members to view secrets', async () => {
    const secret = await createSecret(user1);

    // User2 from same company should be able to read
    await request(app.getHttpServer())
      .get(`/api/secrets/${secret.id}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(200);

    // User2 should NOT be able to edit
    await request(app.getHttpServer())
      .put(`/api/secrets/${secret.id}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ title: 'Updated', value: 'newvalue' })
      .expect(403);

    // User from different company should NOT have access
    await request(app.getHttpServer())
      .get(`/api/secrets/${secret.id}`)
      .set('Authorization', `Bearer ${user3DifferentCompanyToken}`)
      .expect(403);
  });
});
```

### Security Tests

```typescript
// security.e2e.spec.ts
describe('Security Tests', () => {
  it('should prevent SQL injection in search', async () => {
    const maliciousQuery = "'; DROP TABLE user_secrets; --";
    await request(app.getHttpServer())
      .get('/api/secrets')
      .query({ search: maliciousQuery })
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200); // Should not cause error

    // Verify table still exists
    const count = await secretRepository.count();
    expect(count).toBeGreaterThan(0);
  });

  it('should prevent XSS in secret values', async () => {
    const xssPayload = '<script>alert("XSS")</script>';
    const secret = await service.createSecret({
      title: xssPayload,
      value: xssPayload,
      secretType: 'other',
    }, user);

    const retrieved = await service.findById(secret.id, user);
    expect(retrieved.title).toBe(xssPayload); // Stored as-is
    // Frontend should sanitize when displaying
  });

  it('should rate limit master password attempts', async () => {
    const secretId = await createSecretWithMasterPassword('correct');

    // Try 20 times with wrong password
    const requests = [];
    for (let i = 0; i < 20; i++) {
      requests.push(
        request(app.getHttpServer())
          .get(`/api/secrets/${secretId}`)
          .set('Authorization', `Bearer ${jwtToken}`)
          .set('masterpwd', 'wrong')
      );
    }

    const responses = await Promise.all(requests);
    const tooManyRequests = responses.filter(r => r.status === 429);
    expect(tooManyRequests.length).toBeGreaterThan(0);
  });

  it('should not leak secret existence in 404 vs 403', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    // Non-existent secret
    const res1 = await request(app.getHttpServer())
      .get(`/api/secrets/${nonExistentId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(404);

    // Existing secret, no permission
    const secretId = await createSecretForDifferentUser();
    const res2 = await request(app.getHttpServer())
      .get(`/api/secrets/${secretId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(404); // Should also be 404, not 403

    // Both should have same message
    expect(res1.body.message).toBe(res2.body.message);
  });
});
```

### Performance Tests

```typescript
// performance.spec.ts
describe('Performance Tests', () => {
  it('should handle 1000 secrets efficiently', async () => {
    // Create 1000 secrets
    await Promise.all(
      Array.from({ length: 1000 }, (_, i) =>
        service.createSecret({
          title: `Secret ${i}`,
          value: `value${i}`,
          secretType: 'api_key',
        }, user)
      )
    );

    // List should be fast
    const start = Date.now();
    await service.findAll({ userId: user.id, page: 1, limit: 20 });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100); // <100ms
  });

  it('should decrypt secrets in parallel', async () => {
    const secretIds = await createMultipleSecrets(100);

    const start = Date.now();
    await Promise.all(secretIds.map(id => service.findById(id, user)));
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(1000); // <1s for 100 secrets
  });
});
```

---

## Migration and Rollout

### Database Migration Strategy

#### Step 1: Deploy Migration (Backward Compatible)
```bash
# Run migrations
npm run migration:run

# Verify tables created
npm run migration:show
```

#### Step 2: Deploy Backend (Feature Flag)
```typescript
// Add feature flag to environment
SECRETS_FEATURE_ENABLED=true

// In secrets.controller.ts
@Controller('secrets')
@UseGuards(FeatureFlagGuard('SECRETS_FEATURE_ENABLED'))
export class SecretsController {
  // ...
}
```

#### Step 3: Deploy Frontend (Progressive Rollout)
```typescript
// Use feature flag service
if (this.featureFlags.isEnabled('secrets')) {
  // Show secrets menu item
}
```

#### Step 4: Enable for Beta Users
- Enable for internal team first
- Monitor for errors and performance issues
- Gather feedback

#### Step 5: Full Rollout
- Enable for 10% of users
- Monitor metrics (error rates, usage, performance)
- Gradually increase to 100%

### Rollback Plan

If critical issues occur:

1. **Disable Feature Flag**:
   ```bash
   # Backend
   SECRETS_FEATURE_ENABLED=false

   # Frontend
   Feature flag service will hide UI
   ```

2. **Data Remains Safe**:
   - Database tables remain
   - Data is encrypted and safe
   - No data loss

3. **Fix and Redeploy**:
   - Fix issues in staging
   - Re-enable feature flag

### Migration from Beta (If Applicable)

If secrets were stored elsewhere (e.g., connection descriptions):

```typescript
// Migration script: migrate-legacy-secrets.ts
async function migrateLegacySecrets() {
  // Find connections with secrets in description
  const connections = await connectionRepository.find({
    where: { description: Like('%API_KEY:%') },
  });

  for (const connection of connections) {
    // Parse secrets from description
    const secrets = parseSecretsFromDescription(connection.description);

    // Create new secret entities
    for (const secret of secrets) {
      await secretRepository.save({
        userId: connection.authorId,
        title: `${connection.title} - ${secret.name}`,
        value: secret.value,
        secretType: 'api_key',
        tags: ['migrated', connection.title],
      });
    }

    // Remove from description
    connection.description = removeSecretsFromDescription(connection.description);
    await connectionRepository.save(connection);
  }
}
```

---

## Future Enhancements

### Phase 2 Features (Post-Launch)

#### 1. User-to-User Secret Sharing
- Share secrets with specific users
- Permission levels (read-only, read-write)
- Share expiration dates
- Revoke access
- View who has access to each secret

#### 2. Tags and Categorization
- Add multiple tags to secrets
- Filter by tags
- Organize secrets by category
- Tag-based search

#### 3. Secret Types
- Predefined secret types (API Key, Token, Password, Certificate, SSH Key, etc.)
- Type-specific validation
- Filter by secret type
- Type-based templates

#### 4. Descriptions
- Add detailed descriptions to secrets
- Search by description
- Rich text support

#### 5. External Vault Integration
- **AWS Secrets Manager**: Store/retrieve secrets from AWS
- **HashiCorp Vault**: Enterprise secret management
- **Azure Key Vault**: Azure secret storage
- Configuration per company or per secret

#### 6. Secret Versioning
- Keep history of secret changes
- Restore previous versions
- Diff view between versions

#### 7. Secret Rotation
- Automatic expiration warnings
- Integration with external APIs for rotation
- Rotation policies

#### 8. Secret Templates
- Predefined templates for common services (AWS, GitHub, Stripe)
- Auto-populate fields
- Validation for each template

#### 9. Secret Generators
- Password generator with strength indicator
- API key generator
- SSH key pair generator

#### 10. Import/Export
- Encrypted export format
- Import from 1Password, LastPass, etc.
- Bulk operations

#### 11. Browser Extension
- Auto-fill secrets in browser
- Capture new secrets automatically
- Secure communication with main app

#### 12. CLI Tool
- Manage secrets via command line
- Integration with CI/CD pipelines
- Environment variable injection

#### 13. Mobile App
- iOS/Android apps
- Biometric authentication
- Offline access (encrypted)

#### 14. Advanced Audit
- Anomaly detection (unusual access patterns)
- Real-time alerts
- Compliance reports (SOC 2, HIPAA)

#### 15. Secret Dependencies
- Link secrets to connections/resources
- Cascade delete warnings
- Dependency graph

---

## Appendix

### Glossary

- **Secret**: Sensitive information (API key, password, token, etc.) stored encrypted
- **Master Password**: Optional additional password layer for encrypting specific secrets
- **PRIVATE_KEY**: Application-wide encryption key from environment variable
- **Share**: Granting access to a secret to another user
- **Owner**: User who created the secret
- **Audit Log**: Record of all access and modifications to a secret
- **Company Secret**: Secret accessible to all users in a company

### References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/)
- [TypeORM Encryption](https://typeorm.io/)
- [NestJS Security Best Practices](https://docs.nestjs.com/security/encryption-and-hashing)
- [Angular Security Guide](https://angular.io/guide/security)

### Environment Variables Required

```bash
# Existing (required for encryption)
PRIVATE_KEY=your-64-character-or-longer-encryption-key

# New (optional)
SECRETS_FEATURE_ENABLED=true  # Feature flag
SECRET_EXPIRATION_CHECK_CRON="0 0 * * *"  # Daily at midnight
```

### Configuration Examples

#### TypeORM Entity Registration
```typescript
// backend/src/app.module.ts
TypeOrmModule.forRoot({
  // ...
  entities: [
    // Existing entities...
    UserSecretEntity,
    SharedSecretEntity,
    SecretAccessLogEntity,
  ],
}),
```

#### Angular Lazy Loading
```typescript
// frontend/src/app/app-routing.module.ts
{
  path: 'secrets',
  loadChildren: () =>
    import('./components/secrets/secrets.module').then(m => m.SecretsModule),
  canActivate: [AuthGuard],
  data: { title: 'Secrets' },
}
```

---

**End of Specification**

**Next Steps**:
1. Review and approve specification
2. Set up project board with tasks
3. Assign developers to phases
4. Begin Phase 1 implementation

**Questions or Clarifications**:
- Contact: [Your Team]
- Slack: #secrets-feature
- Epic: JIRA-XXX
