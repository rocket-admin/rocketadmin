import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { SitenovaExecuteRawQueryDs } from '../data-structures/sitenova.ds.js';
import { SitenovaRawQueryResultRO } from '../data-structures/sitenova-responses.ds.js';

export interface ISitenovaExecuteRawQuery {
	execute(inputData: SitenovaExecuteRawQueryDs, inTransaction: InTransactionEnum): Promise<SitenovaRawQueryResultRO>;
}
