export interface CreatedHostedDatabase {
	id: string;
	companyId: string;
	databaseName: string;
	hostname: string;
	port: number;
	username: string;
	password: string;
	createdAt: string;
}

export interface FoundHostedDatabase {
	id: string;
	companyId: string;
	databaseName: string;
	hostname: string;
	port: number;
	username: string;
	createdAt: string;
	title?: string;
}
