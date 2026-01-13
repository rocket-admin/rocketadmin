export class CreateSecretDS {
  userId: string;
  slug: string;
  value: string;
  expiresAt?: string;
  masterEncryption?: boolean;
  masterPassword?: string;
}
