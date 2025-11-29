export class UpdateSecretDS {
  userId: string;
  slug: string;
  value?: string;
  expiresAt?: string;
  masterPassword?: string;
}

export class UpdatedSecretDS {
  id: string;
  slug: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date;
  expiresAt?: Date;
  masterEncryption: boolean;
}
