export class GetSecretsDS {
  userId: string;
  page: number;
  limit: number;
  search?: string;
}

export class SecretListItemDS {
  id: string;
  slug: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date;
  expiresAt?: Date;
  masterEncryption: boolean;
}

export class SecretsListDS {
  data: SecretListItemDS[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
