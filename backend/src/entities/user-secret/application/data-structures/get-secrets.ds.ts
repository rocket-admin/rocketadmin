import { PaginationDs } from '../../../table/application/data-structures/pagination.ds.js';

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
  pagination: PaginationDs;
}
