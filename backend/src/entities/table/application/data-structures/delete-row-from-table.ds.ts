export class DeleteRowFromTableDs {
	connectionId: string;
	masterPwd: string;
	primaryKey: Record<string, unknown>;
	tableName: string;
	userId: string;
	uncached?: boolean;
}

export class DeleteRowsFromTableDs {
	connectionId: string;
	masterPwd: string;
	primaryKeys: Array<Record<string, unknown>>;
	tableName: string;
	userId: string;
}
