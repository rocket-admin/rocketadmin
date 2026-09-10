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

// Row-event bridge (plan 37).
export class SitenovaRowEventDs {
	connectionId: string;
	tableName: string;
	event: 'ADD_ROW' | 'UPDATE_ROW' | 'DELETE_ROW';
	primaryKeys: Array<Record<string, unknown>>;
	visitor: {
		uid: string | null;
		email: string | null;
	};
}
