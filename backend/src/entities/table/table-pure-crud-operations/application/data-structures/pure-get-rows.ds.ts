export class PureGetRowsDs {
	connectionId: string;
	masterPwd: string;
	page: number;
	perPage: number;
	query: Record<string, unknown>;
	searchingFieldValue: string;
	tableName: string;
	userId: string | undefined;
	filters?: Record<string, unknown>;
}
