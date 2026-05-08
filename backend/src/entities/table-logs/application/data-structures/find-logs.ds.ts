import { LogOperationTypeEnum } from '../../../../enums/log-operation-type.enum.js';

export class FindLogsDs {
	connectionId: string;
	query: Record<string, string>;
	userId: string;
	operationTypes: Array<LogOperationTypeEnum>;
}
