import { FoundLogsDs } from '../application/data-structures/found-logs.ds.js';
import { FindLogsDs } from '../application/data-structures/find-logs.ds.js';
import { InTransactionEnum } from '../../../enums/index.js';

export interface IFindLogs {
  execute(inputData: FindLogsDs, inTransaction: InTransactionEnum): Promise<FoundLogsDs>;
}
