import { ReadStream } from 'typeorm/platform/PlatformTools.js';
import { LogOperationTypeEnum, QueryOrderingEnum } from '../../../enums/index.js';
import { CreateLogRecordDs } from '../application/data-structures/create-log-record.ds.js';
import { CreatedLogRecordDs } from '../application/data-structures/created-log-record.ds.js';
import { FoundLogsEntities } from '../application/data-structures/found-logs.ds.js';
import { TableLogsEntity } from '../table-logs.entity.js';

export interface ITableLogsRepository {
  createLogRecord(logsData: CreateLogRecordDs): Promise<CreatedLogRecordDs>;

  findLogs(findOptions: IFindLogsOptions): Promise<FoundLogsEntities>;

  saveNewOrUpdatedLogRecord(logRecord: TableLogsEntity): Promise<TableLogsEntity>;

  findLogsAsStream(findOptions: IFindLogsOptions): Promise<ReadStream>;
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
  logOperationType: LogOperationTypeEnum;
  logOperationTypes: Array<LogOperationTypeEnum>;
  searchedAffectedPrimaryKey: string;
}
