export class SitenovaExecuteRawQueryDs {
	connectionId: string;
	userId: string;
	masterPassword: string | null;
	query: string;
	tableName: string | null;
}

export class SitenovaGetConnectionDs {
	connectionId: string;
}

export class SitenovaValidatePublicReadDs {
	connectionId: string;
	tableName: string;
	columnNames: Array<string> | null;
}
