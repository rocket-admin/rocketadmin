export class FoundSecretDS {
  id: string;
  slug: string;
  value?: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date;
  expiresAt?: Date;
  masterEncryption: boolean;
}
