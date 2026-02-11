import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { FindOneConnectionDs } from '../connection/application/data-structures/find-one-connection.ds.js';
import { RequestInfoFromTableDSV2 } from './application/data-structures/request-info-from-table.ds.js';

export interface IRequestInfoFromTableV2 {
	execute(inputData: RequestInfoFromTableDSV2, inTransaction: InTransactionEnum): Promise<void>;
}

export interface IAISettingsAndWidgetsCreation {
	execute(connectionData: FindOneConnectionDs, inTransaction: InTransactionEnum): Promise<void>;
}
