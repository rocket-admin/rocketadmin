export interface Secret {
  id: string;
  slug: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  expiresAt?: string;
  masterEncryption: boolean;
}

export interface SecretListResponse {
  data: Secret[];
  pagination: SecretPagination;
}

export interface SecretPagination {
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
  accessedAt: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

export interface AuditLogResponse {
  data: AuditLogEntry[];
  pagination: SecretPagination;
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

export interface DeleteSecretResponse {
  message: string;
  deletedAt: string;
}
