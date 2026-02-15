export const COMMAND_TYPE = {
	addRowInTable: 'addRowInTable',
	deleteRowInTable: 'deleteRowInTable',
	getRowByPrimaryKey: 'getRowByPrimaryKey',
	getRowsFromTable: 'getRowsFromTable',
	getTableForeignKeys: 'getTableForeignKeys',
	getTablePrimaryColumns: 'getTablePrimaryColumns',
	getTableStructure: 'getTableStructure',
	getTablesFromDB: 'getTablesFromDB',
	testConnect: 'testConnect',
	updateRowInTable: 'updateRowInTable',
	bulkUpdateRowsInTable: 'bulkUpdateRowsInTable',
	validateSettings: 'validateSettings',
	initialConnection: 'initialConnection',
	dataFromAgent: 'dataFromAgent',
	isView: 'isView',
	getRowsAsStream: 'getRowsAsStream',
	executeRawQuery: 'executeRawQuery',
} as const;

export type CommandType = (typeof COMMAND_TYPE)[keyof typeof COMMAND_TYPE];
