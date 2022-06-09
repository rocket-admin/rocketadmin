import { FoundLogsDs } from '../application/data-structures/found-logs.ds';
import { FindLogsDs } from '../application/data-structures/find-logs.ds';

export interface IFindLogs {
  execute(inputData: FindLogsDs): Promise<FoundLogsDs>;
}
