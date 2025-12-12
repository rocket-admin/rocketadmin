export class FoundSecretDS {
  id: string;
  slug: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date;
  expiresAt?: Date;
  masterEncryption: boolean;
}
