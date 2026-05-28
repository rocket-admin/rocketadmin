import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { RequestAISettingsCreationDs } from './application/data-structures/request-ai-settings-creation.ds.js';
import { RequestInfoFromTableDSV2 } from './application/data-structures/request-info-from-table.ds.js';

export interface IRequestInfoFromTableV2 {
	execute(inputData: RequestInfoFromTableDSV2, inTransaction: InTransactionEnum): Promise<void>;
}

export interface IAISettingsAndWidgetsCreation {
	execute(inputData: RequestAISettingsCreationDs, inTransaction: InTransactionEnum): Promise<void>;
}
