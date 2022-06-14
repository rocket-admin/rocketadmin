import { CreateLogRecordDs } from '../application/data-structures/create-log-record.ds';
import { CreatedLogRecordDs } from '../application/data-structures/created-log-record.ds';
import { FoundLogsEntities } from '../application/data-structures/found-logs.ds';
import { QueryOrderingEnum } from '../../../enums';

export interface ITableLogsRepository {
  createLogRecord(logsData: CreateLogRecordDs): Promise<CreatedLogRecordDs>;

  findLogs(findOptions: IFindLogsOptions): Promise<FoundLogsEntities>;
}

export interface IFindLogsOptions {
  connectionId: string;
  currentUserId: string;
  dateFrom: Date;
  dateTo: Date;
  order: QueryOrderingEnum;
  page: number;
  perPage: number;
  searchedEmail: string;
  tableName: string;
  userConnectionEdit: boolean;
  userInGroupsIds: Array<string>;
}
