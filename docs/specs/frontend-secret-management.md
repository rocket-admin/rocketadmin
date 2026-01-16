# Frontend Secret Management Specification

## Overview

This specification describes the frontend implementation for company secret management, allowing users to securely store, retrieve, and manage secrets (API keys, passwords, tokens) within their company context.

## Backend API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/secrets` | Create a new secret |
| `GET` | `/secrets` | List all company secrets (paginated) |
| `GET` | `/secrets/:slug` | Get secret with decrypted value |
| `PUT` | `/secrets/:slug` | Update secret value/expiration |
| `DELETE` | `/secrets/:slug` | Delete secret |
| `GET` | `/secrets/:slug/audit-log` | Get audit log for secret (paginated) |

### Data Models

```typescript
// Request DTOs
interface CreateSecretRequest {
  slug: string;              // 1-255 chars, pattern: ^[a-zA-Z0-9_-]+$
  value: string;             // 1-10000 chars
  expiresAt?: string;        // ISO 8601 format (optional)
  masterEncryption?: boolean; // Default: false
  masterPassword?: string;   // Required if masterEncryption=true, min 8 chars
}

interface UpdateSecretRequest {
  value: string;             // 1-10000 chars
  expiresAt?: string | null; // ISO 8601 format, null to remove
}

// Response DTOs
interface SecretListItem {
  id: string;
  slug: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  expiresAt?: string;
  masterEncryption: boolean;
}

interface SecretListResponse {
  data: SecretListItem[];
  pagination: {
    total: number;
    currentPage: number;
    perPage: number;
    lastPage: number;
  };
}

interface SecretDetail {
  id: string;
  slug: string;
  value: string;             // Decrypted value
  companyId: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  expiresAt?: string;
  masterEncryption: boolean;
}

interface DeleteSecretResponse {
  message: string;
  deletedAt: string;
}

interface AuditLogEntry {
  id: string;
  action: 'create' | 'view' | 'copy' | 'update' | 'delete';
  user: {
    id: string;
    email: string;
  };
  accessedAt: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

interface AuditLogResponse {
  data: AuditLogEntry[];
  pagination: {
    total: number;
    currentPage: number;
    perPage: number;
    lastPage: number;
  };
}
```

### HTTP Headers

- `masterPassword`: Custom header for master-encrypted secrets (sent via interceptor or manual header)

### Error Responses

| Status | Meaning |
|--------|---------|
| 400 | Validation error (invalid slug format, malformed body) |
| 403 | Master password required or incorrect |
| 404 | Secret not found |
| 409 | Duplicate slug in company |
| 410 | Secret has expired |

---

## Frontend Implementation

### 1. File Structure

```
frontend/src/app/
├── components/
│   └── secrets/
│       ├── secrets.component.ts
│       ├── secrets.component.html
│       ├── secrets.component.css
│       ├── secrets.component.spec.ts
│       ├── create-secret-dialog/
│       │   ├── create-secret-dialog.component.ts
│       │   ├── create-secret-dialog.component.html
│       │   ├── create-secret-dialog.component.css
│       │   └── create-secret-dialog.component.spec.ts
│       ├── view-secret-dialog/
│       │   ├── view-secret-dialog.component.ts
│       │   ├── view-secret-dialog.component.html
│       │   ├── view-secret-dialog.component.css
│       │   └── view-secret-dialog.component.spec.ts
│       ├── edit-secret-dialog/
│       │   ├── edit-secret-dialog.component.ts
│       │   ├── edit-secret-dialog.component.html
│       │   ├── edit-secret-dialog.component.css
│       │   └── edit-secret-dialog.component.spec.ts
│       ├── delete-secret-dialog/
│       │   ├── delete-secret-dialog.component.ts
│       │   ├── delete-secret-dialog.component.html
│       │   ├── delete-secret-dialog.component.css
│       │   └── delete-secret-dialog.component.spec.ts
│       ├── audit-log-dialog/
│       │   ├── audit-log-dialog.component.ts
│       │   ├── audit-log-dialog.component.html
│       │   ├── audit-log-dialog.component.css
│       │   └── audit-log-dialog.component.spec.ts
│       └── master-password-dialog/
│           ├── master-password-dialog.component.ts
│           ├── master-password-dialog.component.html
│           ├── master-password-dialog.component.css
│           └── master-password-dialog.component.spec.ts
├── services/
│   └── secrets.service.ts
└── models/
│   └── secret.ts
```

### 2. Model Definitions

**File:** `frontend/src/app/models/secret.ts`

```typescript
export interface Secret {
  id: string;
  slug: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date;
  expiresAt?: Date;
  masterEncryption: boolean;
}

export interface SecretWithValue extends Secret {
  value: string;
}

export interface SecretListResponse {
  data: Secret[];
  pagination: Pagination;
}

export interface Pagination {
  total: number;
  currentPage: number;
  perPage: number;
  lastPage: number;
}

export interface AuditLogEntry {
  id: string;
  action: SecretAction;
  user: {
    id: string;
    email: string;
  };
  accessedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

export interface AuditLogResponse {
  data: AuditLogEntry[];
  pagination: Pagination;
}

export type SecretAction = 'create' | 'view' | 'copy' | 'update' | 'delete';

export interface CreateSecretPayload {
  slug: string;
  value: string;
  expiresAt?: string;
  masterEncryption?: boolean;
  masterPassword?: string;
}

export interface UpdateSecretPayload {
  value: string;
  expiresAt?: string | null;
}
```

### 3. Service Implementation

**File:** `frontend/src/app/services/secrets.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, EMPTY, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { NotificationsService } from './notifications.service';
import {
  Secret,
  SecretWithValue,
  SecretListResponse,
  AuditLogResponse,
  CreateSecretPayload,
  UpdateSecretPayload,
} from '../models/secret';

@Injectable({
  providedIn: 'root'
})
export class SecretsService {
  private secretsUpdated = new BehaviorSubject<string>('');
  public cast = this.secretsUpdated.asObservable();

  constructor(
    private _http: HttpClient,
    private _notifications: NotificationsService
  ) {}

  fetchSecrets(page: number = 1, limit: number = 20, search?: string): Observable<SecretListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this._http.get<SecretListResponse>('/secrets', { params })
      .pipe(
        map(res => res),
        catchError((err) => {
          this._notifications.showErrorSnackbar(err.error?.message || 'Failed to fetch secrets');
          return EMPTY;
        })
      );
  }

  getSecret(slug: string, masterPassword?: string): Observable<SecretWithValue> {
    let headers = new HttpHeaders();
    if (masterPassword) {
      headers = headers.set('masterPassword', masterPassword);
    }

    return this._http.get<SecretWithValue>(`/secrets/${slug}`, { headers })
      .pipe(
        map(res => res),
        catchError((err) => {
          if (err.status === 403) {
            // Master password required or invalid - handled by component
            throw err;
          }
          if (err.status === 410) {
            this._notifications.showErrorSnackbar('This secret has expired');
          } else {
            this._notifications.showErrorSnackbar(err.error?.message || 'Failed to fetch secret');
          }
          return EMPTY;
        })
      );
  }

  createSecret(payload: CreateSecretPayload): Observable<Secret> {
    return this._http.post<Secret>('/secrets', payload)
      .pipe(
        map(res => {
          this._notifications.showSuccessSnackbar('Secret created successfully');
          this.secretsUpdated.next('created');
          return res;
        }),
        catchError((err) => {
          if (err.status === 409) {
            this._notifications.showErrorSnackbar('A secret with this slug already exists');
          } else {
            this._notifications.showErrorSnackbar(err.error?.message || 'Failed to create secret');
          }
          return EMPTY;
        })
      );
  }

  updateSecret(slug: string, payload: UpdateSecretPayload, masterPassword?: string): Observable<Secret> {
    let headers = new HttpHeaders();
    if (masterPassword) {
      headers = headers.set('masterPassword', masterPassword);
    }

    return this._http.put<Secret>(`/secrets/${slug}`, payload, { headers })
      .pipe(
        map(res => {
          this._notifications.showSuccessSnackbar('Secret updated successfully');
          this.secretsUpdated.next('updated');
          return res;
        }),
        catchError((err) => {
          if (err.status === 403) {
            throw err; // Master password required - handled by component
          }
          if (err.status === 410) {
            this._notifications.showErrorSnackbar('Cannot update an expired secret');
          } else {
            this._notifications.showErrorSnackbar(err.error?.message || 'Failed to update secret');
          }
          return EMPTY;
        })
      );
  }

  deleteSecret(slug: string): Observable<{ message: string; deletedAt: string }> {
    return this._http.delete<{ message: string; deletedAt: string }>(`/secrets/${slug}`)
      .pipe(
        map(res => {
          this._notifications.showSuccessSnackbar('Secret deleted successfully');
          this.secretsUpdated.next('deleted');
          return res;
        }),
        catchError((err) => {
          this._notifications.showErrorSnackbar(err.error?.message || 'Failed to delete secret');
          return EMPTY;
        })
      );
  }

  getAuditLog(slug: string, page: number = 1, limit: number = 50): Observable<AuditLogResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this._http.get<AuditLogResponse>(`/secrets/${slug}/audit-log`, { params })
      .pipe(
        map(res => res),
        catchError((err) => {
          this._notifications.showErrorSnackbar(err.error?.message || 'Failed to fetch audit log');
          return EMPTY;
        })
      );
  }
}
```

### 4. Main Component

**File:** `frontend/src/app/components/secrets/secrets.component.ts`

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { Subscription, Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Angulartics2 } from 'angulartics2';

import { SecretsService } from 'src/app/services/secrets.service';
import { Secret, Pagination } from 'src/app/models/secret';
import { CreateSecretDialogComponent } from './create-secret-dialog/create-secret-dialog.component';
import { ViewSecretDialogComponent } from './view-secret-dialog/view-secret-dialog.component';
import { EditSecretDialogComponent } from './edit-secret-dialog/edit-secret-dialog.component';
import { DeleteSecretDialogComponent } from './delete-secret-dialog/delete-secret-dialog.component';
import { AuditLogDialogComponent } from './audit-log-dialog/audit-log-dialog.component';
import { PlaceholderTableDataComponent } from '../skeletons/placeholder-table-data/placeholder-table-data.component';

@Component({
  selector: 'app-secrets',
  templateUrl: './secrets.component.html',
  styleUrls: ['./secrets.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatInputModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatChipsModule,
    PlaceholderTableDataComponent,
  ]
})
export class SecretsComponent implements OnInit, OnDestroy {
  public secrets: Secret[] = [];
  public pagination: Pagination = {
    total: 0,
    currentPage: 1,
    perPage: 20,
    lastPage: 1,
  };
  public loading = true;
  public searchQuery = '';
  public displayedColumns = ['slug', 'masterEncryption', 'expiresAt', 'updatedAt', 'actions'];

  private searchSubject = new Subject<string>();
  private subscriptions: Subscription[] = [];

  constructor(
    private _secrets: SecretsService,
    private dialog: MatDialog,
    private angulartics2: Angulartics2
  ) {}

  ngOnInit(): void {
    this.loadSecrets();

    // Subscribe to search input with debounce
    const searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.pagination.currentPage = 1;
      this.loadSecrets();
    });
    this.subscriptions.push(searchSub);

    // Subscribe to service updates
    const updateSub = this._secrets.cast.subscribe(action => {
      if (action) {
        this.loadSecrets();
      }
    });
    this.subscriptions.push(updateSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadSecrets(): void {
    this.loading = true;
    this._secrets.fetchSecrets(
      this.pagination.currentPage,
      this.pagination.perPage,
      this.searchQuery || undefined
    ).subscribe(response => {
      this.secrets = response.data;
      this.pagination = response.pagination;
      this.loading = false;
    });
  }

  onSearchChange(query: string): void {
    this.searchSubject.next(query);
  }

  onPageChange(event: PageEvent): void {
    this.pagination.currentPage = event.pageIndex + 1;
    this.pagination.perPage = event.pageSize;
    this.loadSecrets();
  }

  isExpired(secret: Secret): boolean {
    if (!secret.expiresAt) return false;
    return new Date(secret.expiresAt) < new Date();
  }

  openCreateDialog(): void {
    this.dialog.open(CreateSecretDialogComponent, {
      width: '500px',
    });
  }

  openViewDialog(secret: Secret): void {
    this.dialog.open(ViewSecretDialogComponent, {
      width: '600px',
      data: { secret },
    });
  }

  openEditDialog(secret: Secret): void {
    this.dialog.open(EditSecretDialogComponent, {
      width: '500px',
      data: { secret },
    });
  }

  openDeleteDialog(secret: Secret): void {
    this.dialog.open(DeleteSecretDialogComponent, {
      width: '400px',
      data: { secret },
    });
  }

  openAuditLogDialog(secret: Secret): void {
    this.dialog.open(AuditLogDialogComponent, {
      width: '800px',
      maxHeight: '80vh',
      data: { secret },
    });
  }
}
```

### 5. Dialog Components

#### Create Secret Dialog

**File:** `frontend/src/app/components/secrets/create-secret-dialog/create-secret-dialog.component.ts`

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { Angulartics2 } from 'angulartics2';

import { SecretsService } from 'src/app/services/secrets.service';

@Component({
  selector: 'app-create-secret-dialog',
  templateUrl: './create-secret-dialog.component.html',
  styleUrls: ['./create-secret-dialog.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
  ]
})
export class CreateSecretDialogComponent {
  public form: FormGroup;
  public submitting = false;
  public showValue = false;
  public showMasterPassword = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateSecretDialogComponent>,
    private _secrets: SecretsService,
    private angulartics2: Angulartics2
  ) {
    this.form = this.fb.group({
      slug: ['', [
        Validators.required,
        Validators.maxLength(255),
        Validators.pattern(/^[a-zA-Z0-9_-]+$/)
      ]],
      value: ['', [Validators.required, Validators.maxLength(10000)]],
      expiresAt: [null],
      masterEncryption: [false],
      masterPassword: [''],
    });

    // Add master password validation when masterEncryption is enabled
    this.form.get('masterEncryption')?.valueChanges.subscribe(enabled => {
      const masterPasswordControl = this.form.get('masterPassword');
      if (enabled) {
        masterPasswordControl?.setValidators([Validators.required, Validators.minLength(8)]);
      } else {
        masterPasswordControl?.clearValidators();
      }
      masterPasswordControl?.updateValueAndValidity();
    });
  }

  get slugError(): string {
    const control = this.form.get('slug');
    if (control?.hasError('required')) return 'Slug is required';
    if (control?.hasError('maxlength')) return 'Slug must be 255 characters or less';
    if (control?.hasError('pattern')) return 'Slug can only contain letters, numbers, hyphens, and underscores';
    return '';
  }

  get valueError(): string {
    const control = this.form.get('value');
    if (control?.hasError('required')) return 'Value is required';
    if (control?.hasError('maxlength')) return 'Value must be 10000 characters or less';
    return '';
  }

  get masterPasswordError(): string {
    const control = this.form.get('masterPassword');
    if (control?.hasError('required')) return 'Master password is required for encryption';
    if (control?.hasError('minlength')) return 'Master password must be at least 8 characters';
    return '';
  }

  toggleValueVisibility(): void {
    this.showValue = !this.showValue;
  }

  toggleMasterPasswordVisibility(): void {
    this.showMasterPassword = !this.showMasterPassword;
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.submitting = true;
    const formValue = this.form.value;

    const payload = {
      slug: formValue.slug,
      value: formValue.value,
      expiresAt: formValue.expiresAt ? new Date(formValue.expiresAt).toISOString() : undefined,
      masterEncryption: formValue.masterEncryption || undefined,
      masterPassword: formValue.masterEncryption ? formValue.masterPassword : undefined,
    };

    this._secrets.createSecret(payload).subscribe({
      next: () => {
        this.angulartics2.eventTrack.next({
          action: 'Secrets: secret created successfully',
        });
        this.submitting = false;
        this.dialogRef.close(true);
      },
      error: () => {
        this.submitting = false;
      }
    });
  }
}
```

#### View Secret Dialog

**File:** `frontend/src/app/components/secrets/view-secret-dialog/view-secret-dialog.component.ts`

```typescript
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Clipboard } from '@angular/cdk/clipboard';
import { Angulartics2 } from 'angulartics2';

import { SecretsService } from 'src/app/services/secrets.service';
import { NotificationsService } from 'src/app/services/notifications.service';
import { Secret, SecretWithValue } from 'src/app/models/secret';

@Component({
  selector: 'app-view-secret-dialog',
  templateUrl: './view-secret-dialog.component.html',
  styleUrls: ['./view-secret-dialog.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ]
})
export class ViewSecretDialogComponent implements OnInit {
  public secret: SecretWithValue | null = null;
  public loading = true;
  public showValue = false;
  public requiresMasterPassword = false;
  public masterPassword = '';
  public masterPasswordError = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { secret: Secret },
    private dialogRef: MatDialogRef<ViewSecretDialogComponent>,
    private _secrets: SecretsService,
    private _notifications: NotificationsService,
    private clipboard: Clipboard,
    private angulartics2: Angulartics2
  ) {}

  ngOnInit(): void {
    this.loadSecret();
  }

  loadSecret(masterPassword?: string): void {
    this.loading = true;
    this.masterPasswordError = '';

    this._secrets.getSecret(this.data.secret.slug, masterPassword).subscribe({
      next: (secret) => {
        this.secret = secret;
        this.loading = false;
        this.requiresMasterPassword = false;
        this.angulartics2.eventTrack.next({
          action: 'Secrets: secret viewed',
        });
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 403) {
          this.requiresMasterPassword = true;
          if (masterPassword) {
            this.masterPasswordError = 'Invalid master password';
          }
        }
      }
    });
  }

  submitMasterPassword(): void {
    if (!this.masterPassword) {
      this.masterPasswordError = 'Please enter the master password';
      return;
    }
    this.loadSecret(this.masterPassword);
  }

  toggleValueVisibility(): void {
    this.showValue = !this.showValue;
  }

  copyToClipboard(): void {
    if (this.secret?.value) {
      this.clipboard.copy(this.secret.value);
      this._notifications.showSuccessSnackbar('Secret copied to clipboard');
      this.angulartics2.eventTrack.next({
        action: 'Secrets: secret copied to clipboard',
      });
    }
  }
}
```

#### Edit Secret Dialog

**File:** `frontend/src/app/components/secrets/edit-secret-dialog/edit-secret-dialog.component.ts`

```typescript
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Angulartics2 } from 'angulartics2';

import { SecretsService } from 'src/app/services/secrets.service';
import { Secret, SecretWithValue } from 'src/app/models/secret';

@Component({
  selector: 'app-edit-secret-dialog',
  templateUrl: './edit-secret-dialog.component.html',
  styleUrls: ['./edit-secret-dialog.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
  ]
})
export class EditSecretDialogComponent implements OnInit {
  public form: FormGroup;
  public loading = true;
  public submitting = false;
  public showValue = false;
  public requiresMasterPassword = false;
  public masterPassword = '';
  public masterPasswordError = '';
  public currentSecret: SecretWithValue | null = null;
  public clearExpiration = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { secret: Secret },
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EditSecretDialogComponent>,
    private _secrets: SecretsService,
    private angulartics2: Angulartics2
  ) {
    this.form = this.fb.group({
      value: ['', [Validators.required, Validators.maxLength(10000)]],
      expiresAt: [null],
    });
  }

  ngOnInit(): void {
    this.loadSecret();
  }

  loadSecret(masterPassword?: string): void {
    this.loading = true;
    this.masterPasswordError = '';

    this._secrets.getSecret(this.data.secret.slug, masterPassword).subscribe({
      next: (secret) => {
        this.currentSecret = secret;
        this.form.patchValue({
          value: secret.value,
          expiresAt: secret.expiresAt ? new Date(secret.expiresAt) : null,
        });
        this.loading = false;
        this.requiresMasterPassword = false;
        this.masterPassword = masterPassword || '';
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 403) {
          this.requiresMasterPassword = true;
          if (masterPassword) {
            this.masterPasswordError = 'Invalid master password';
          }
        }
      }
    });
  }

  submitMasterPassword(): void {
    if (!this.masterPassword) {
      this.masterPasswordError = 'Please enter the master password';
      return;
    }
    this.loadSecret(this.masterPassword);
  }

  toggleValueVisibility(): void {
    this.showValue = !this.showValue;
  }

  get valueError(): string {
    const control = this.form.get('value');
    if (control?.hasError('required')) return 'Value is required';
    if (control?.hasError('maxlength')) return 'Value must be 10000 characters or less';
    return '';
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.submitting = true;
    const formValue = this.form.value;

    const payload = {
      value: formValue.value,
      expiresAt: this.clearExpiration
        ? null
        : (formValue.expiresAt ? new Date(formValue.expiresAt).toISOString() : undefined),
    };

    this._secrets.updateSecret(
      this.data.secret.slug,
      payload,
      this.data.secret.masterEncryption ? this.masterPassword : undefined
    ).subscribe({
      next: () => {
        this.angulartics2.eventTrack.next({
          action: 'Secrets: secret updated successfully',
        });
        this.submitting = false;
        this.dialogRef.close(true);
      },
      error: () => {
        this.submitting = false;
      }
    });
  }
}
```

#### Delete Secret Dialog

**File:** `frontend/src/app/components/secrets/delete-secret-dialog/delete-secret-dialog.component.ts`

```typescript
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Angulartics2 } from 'angulartics2';

import { SecretsService } from 'src/app/services/secrets.service';
import { Secret } from 'src/app/models/secret';

@Component({
  selector: 'app-delete-secret-dialog',
  templateUrl: './delete-secret-dialog.component.html',
  styleUrls: ['./delete-secret-dialog.component.css'],
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
  ]
})
export class DeleteSecretDialogComponent {
  public submitting = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { secret: Secret },
    private dialogRef: MatDialogRef<DeleteSecretDialogComponent>,
    private _secrets: SecretsService,
    private angulartics2: Angulartics2
  ) {}

  onDelete(): void {
    this.submitting = true;
    this._secrets.deleteSecret(this.data.secret.slug).subscribe({
      next: () => {
        this.angulartics2.eventTrack.next({
          action: 'Secrets: secret deleted successfully',
        });
        this.submitting = false;
        this.dialogRef.close(true);
      },
      error: () => {
        this.submitting = false;
      }
    });
  }
}
```

#### Audit Log Dialog

**File:** `frontend/src/app/components/secrets/audit-log-dialog/audit-log-dialog.component.ts`

```typescript
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SecretsService } from 'src/app/services/secrets.service';
import { Secret, AuditLogEntry, Pagination } from 'src/app/models/secret';

@Component({
  selector: 'app-audit-log-dialog',
  templateUrl: './audit-log-dialog.component.html',
  styleUrls: ['./audit-log-dialog.component.css'],
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ]
})
export class AuditLogDialogComponent implements OnInit {
  public logs: AuditLogEntry[] = [];
  public pagination: Pagination = {
    total: 0,
    currentPage: 1,
    perPage: 50,
    lastPage: 1,
  };
  public loading = true;
  public displayedColumns = ['action', 'user', 'accessedAt', 'success'];

  public actionLabels: Record<string, string> = {
    create: 'Created',
    view: 'Viewed',
    copy: 'Copied',
    update: 'Updated',
    delete: 'Deleted',
  };

  public actionIcons: Record<string, string> = {
    create: 'add_circle',
    view: 'visibility',
    copy: 'content_copy',
    update: 'edit',
    delete: 'delete',
  };

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { secret: Secret },
    private dialogRef: MatDialogRef<AuditLogDialogComponent>,
    private _secrets: SecretsService
  ) {}

  ngOnInit(): void {
    this.loadAuditLog();
  }

  loadAuditLog(): void {
    this.loading = true;
    this._secrets.getAuditLog(
      this.data.secret.slug,
      this.pagination.currentPage,
      this.pagination.perPage
    ).subscribe(response => {
      this.logs = response.data;
      this.pagination = response.pagination;
      this.loading = false;
    });
  }

  onPageChange(event: PageEvent): void {
    this.pagination.currentPage = event.pageIndex + 1;
    this.pagination.perPage = event.pageSize;
    this.loadAuditLog();
  }
}
```

#### Master Password Dialog (Reusable)

**File:** `frontend/src/app/components/secrets/master-password-dialog/master-password-dialog.component.ts`

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-master-password-dialog',
  templateUrl: './master-password-dialog.component.html',
  styleUrls: ['./master-password-dialog.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
  ]
})
export class MasterPasswordDialogComponent {
  public masterPassword = '';
  public showPassword = false;
  public error = '';

  constructor(
    private dialogRef: MatDialogRef<MasterPasswordDialogComponent>
  ) {}

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (!this.masterPassword) {
      this.error = 'Please enter the master password';
      return;
    }
    this.dialogRef.close(this.masterPassword);
  }
}
```

### 6. Routing

Add route to company or settings module:

```typescript
// In app.routes.ts or appropriate routing module
{
  path: 'company/secrets',
  component: SecretsComponent,
  canActivate: [AuthGuard],
}
```

### 7. Navigation

Add link in company settings or sidebar:

```html
<!-- In company navigation or sidebar -->
<a routerLink="/company/secrets" routerLinkActive="active">
  <mat-icon>key</mat-icon>
  <span>Secrets</span>
</a>
```

---

## UI/UX Requirements

### Main Secrets List

1. **Table columns:**
   - Slug (clickable to view)
   - Master Encryption (lock icon indicator)
   - Expires At (with visual indicator for expired/expiring soon)
   - Last Updated
   - Actions menu (View, Edit, Audit Log, Delete)

2. **Features:**
   - Search/filter by slug
   - Pagination (20 items per page default)
   - "Create Secret" button
   - Loading skeleton while fetching

3. **Visual indicators:**
   - Lock icon for master-encrypted secrets
   - Red chip/badge for expired secrets
   - Warning chip for secrets expiring within 7 days

### Create Secret Dialog

1. **Form fields:**
   - Slug (text input with validation pattern display)
   - Value (textarea with show/hide toggle)
   - Expiration date (optional date picker)
   - Master encryption toggle
   - Master password (conditional, with show/hide toggle)

2. **Validation messages:**
   - Real-time validation feedback
   - Pattern hint for slug format

### View Secret Dialog

1. **Display:**
   - Secret metadata (slug, created, updated, expires)
   - Value with show/hide toggle (hidden by default)
   - Copy to clipboard button
   - Master password prompt if required

2. **Security:**
   - Value hidden by default
   - Auto-hide value after 30 seconds of visibility

### Edit Secret Dialog

1. **Form fields:**
   - Value (pre-populated, with show/hide toggle)
   - Expiration date (with clear option)
   - Master password prompt if required

### Delete Secret Dialog

1. **Confirmation:**
   - Display secret slug
   - Warning about irreversibility
   - Confirm/Cancel buttons

### Audit Log Dialog

1. **Table columns:**
   - Action (with icon)
   - User email
   - Timestamp
   - Success status

2. **Features:**
   - Pagination (50 items per page default)
   - Color-coded action types
   - Failed attempts highlighted in red

---

## Security Considerations

1. **Value visibility:**
   - Secret values hidden by default in all views
   - Explicit user action required to reveal
   - Consider auto-hiding after timeout

2. **Master password:**
   - Never stored in frontend state beyond immediate use
   - Cleared from memory after API call
   - Not logged or tracked

3. **Clipboard:**
   - Consider clearing clipboard after timeout
   - Show notification when copied

4. **Session:**
   - Respect existing auth token expiration
   - Clear sensitive data on logout

---

## Testing Requirements

### Unit Tests

1. **Service tests:**
   - All CRUD operations
   - Error handling for each status code
   - Master password header inclusion

2. **Component tests:**
   - Form validation
   - Dialog open/close behavior
   - Loading states
   - Pagination

### E2E Tests

1. **Happy path flows:**
   - Create secret without master encryption
   - Create secret with master encryption
   - View secret (both encrypted types)
   - Edit secret
   - Delete secret
   - View audit log

2. **Error scenarios:**
   - Duplicate slug
   - Invalid master password
   - Expired secret access
   - Network errors

---

## Analytics Events

Track the following events via Angulartics2:

| Event | Action |
|-------|--------|
| Create | `Secrets: secret created successfully` |
| View | `Secrets: secret viewed` |
| Copy | `Secrets: secret copied to clipboard` |
| Update | `Secrets: secret updated successfully` |
| Delete | `Secrets: secret deleted successfully` |
| Audit Log View | `Secrets: audit log viewed` |

---

## Implementation Checklist

- [ ] Create model definitions (`models/secret.ts`)
- [ ] Implement secrets service (`services/secrets.service.ts`)
- [ ] Create main secrets component
- [ ] Create dialog components:
  - [ ] Create secret dialog
  - [ ] View secret dialog
  - [ ] Edit secret dialog
  - [ ] Delete secret dialog
  - [ ] Audit log dialog
  - [ ] Master password dialog
- [ ] Add routing
- [ ] Add navigation link
- [ ] Write unit tests
- [ ] Write E2E tests
- [ ] Add analytics tracking
