export class CreatedSecretDS {
	id: string;
	slug: string;
	companyId: string;
	createdAt: Date;
	updatedAt: Date;
	lastAccessedAt?: Date | null;
	expiresAt?: Date | null;
	masterEncryption: boolean;
}
