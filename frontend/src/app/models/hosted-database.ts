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

export interface CreateHostedDatabaseConnectionPayload {
	companyId: string;
	userId: string;
	databaseName: string;
	hostname: string;
	port: number;
	username: string;
	password: string;
}

export interface CreatedHostedDatabaseConnection {
	id: string;
	token?: string | null;
}
