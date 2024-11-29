import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { RequestInfoFromTableDS } from './application/data-structures/request-info-from-table.ds.js';
import { ResponseInfoDS } from './application/data-structures/response-info.ds.js';

export interface IRequestInfoFromTable {
  execute(inputData: RequestInfoFromTableDS, inTransaction: InTransactionEnum): Promise<ResponseInfoDS>;
}
