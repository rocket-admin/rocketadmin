import { FoundLogsDs } from '../application/data-structures/found-logs.ds';
import { FindLogsDs } from '../application/data-structures/find-logs.ds';
import { InTransactionEnum } from '../../../enums';

export interface IFindLogs {
  execute(inputData: FindLogsDs, inTransaction: InTransactionEnum): Promise<FoundLogsDs>;
}
