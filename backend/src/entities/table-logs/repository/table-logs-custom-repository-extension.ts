import { UserEntity } from '../../user/user.entity.js';
import { CreateLogRecordDs } from '../application/data-structures/create-log-record.ds.js';
import { CreatedLogRecordDs } from '../application/data-structures/created-log-record.ds.js';
import { FoundLogsEntities } from '../application/data-structures/found-logs.ds.js';
import { TableLogsEntity } from '../table-logs.entity.js';
import { buildCreatedLogRecord } from '../utils/build-created-log-record.js';
import { buildTableLogsEntity } from '../utils/build-table-logs-entity.js';
import { IFindLogsOptions, ITableLogsRepository } from './table-logs-repository.interface.js';
import { ReadStream } from 'typeorm/platform/PlatformTools.js';

export const tableLogsCustomRepositoryExtension: ITableLogsRepository = {
  async createLogRecord(logData: CreateLogRecordDs): Promise<CreatedLogRecordDs> {
    const { userId } = logData;
    const userQb = this.manager
      .getRepository(UserEntity)
      .createQueryBuilder('user')
      .where('user.id = id', { id: userId });
    const { email } = await userQb.getOne();
    const newLogRecord = buildTableLogsEntity(logData, email);
    const savedLogRecord = await this.save(newLogRecord);
    return buildCreatedLogRecord(savedLogRecord);
  },

  async saveNewOrUpdatedLogRecord(logRecord: TableLogsEntity): Promise<TableLogsEntity> {
    return await this.save(logRecord);
  },

  async findLogs(findOptions: IFindLogsOptions): Promise<FoundLogsEntities> {
    const {
      connectionId,
      currentUserId,
      dateFrom,
      dateTo,
      order,
      page,
      perPage,
      searchedEmail,
      tableName,
      userConnectionEdit,
      userInGroupsIds,
      logOperationType,
      logOperationTypes,
      searchedAffectedPrimaryKey,
    } = findOptions;
    const qb = this.createQueryBuilder('tableLogs').leftJoinAndSelect('tableLogs.connection_id', 'connection_id');
    qb.andWhere('tableLogs.connection_id = :connection_id', { connection_id: connectionId });

    if (tableName) {
      qb.andWhere('tableLogs.table_name = :table_name', { table_name: tableName });
    }

    if (searchedAffectedPrimaryKey) {
      qb.andWhere('tableLogs.affected_primary_key LIKE :searchString', {
        searchString: `%${searchedAffectedPrimaryKey}%`,
      });
    }

    if (!userConnectionEdit) {
      if (userInGroupsIds.length > 0) {
        for (const userId of userInGroupsIds) {
          qb.orWhere('tableLogs.cognitoUserName = :userIdInAdminGroup', { userIdInAdminGroup: userId });
        }
      } else {
        qb.andWhere('tableLogs.cognitoUserName = :currentUserId', { currentUserId: currentUserId });
      }
    }
    qb.orderBy('tableLogs.createdAt', order);
    if (dateFrom && dateTo) {
      qb.andWhere('tableLogs.createdAt >= :date_from', { date_from: dateFrom });
      qb.andWhere('tableLogs.createdAt <= :date_to', { date_to: dateTo });
    }
    if (searchedEmail) {
      qb.andWhere('tableLogs.email = :searchMail', { searchMail: searchedEmail });
    }
    if (logOperationType) {
      qb.andWhere('tableLogs.operationType = :logOperationType', { logOperationType: logOperationType });
    }
    if (logOperationTypes.length > 0) {
      for (const type of logOperationTypes) {
        qb.orWhere('tableLogs.operationType = :type', { type: type });
      }
    }
    const rowsCount = await qb.getCount();
    const lastPage = Math.ceil(rowsCount / perPage);
    const offset = (page - 1) * perPage;
    qb.limit(perPage);
    qb.offset(offset);
    const logs = await qb.getMany();
    return {
      logs: logs,
      pagination: {
        currentPage: page,
        lastPage: lastPage,
        perPage: perPage,
        total: rowsCount,
      },
    };
  },

  async findLogsAsStream(findOptions: IFindLogsOptions): Promise<ReadStream> {
    const {
      connectionId,
      currentUserId,
      dateFrom,
      dateTo,
      order,
      page,
      perPage,
      searchedEmail,
      tableName,
      userConnectionEdit,
      userInGroupsIds,
      logOperationType,
      logOperationTypes,
      searchedAffectedPrimaryKey,
    } = findOptions;
    const qb = this.createQueryBuilder('tableLogs').leftJoinAndSelect('tableLogs.connection_id', 'connection_id');
    qb.andWhere('tableLogs.connection_id = :connection_id', { connection_id: connectionId });
    if (tableName) {
      qb.andWhere('tableLogs.table_name = :table_name', { table_name: tableName });
    }
    if (searchedAffectedPrimaryKey) {
      qb.andWhere('tableLogs.affected_primary_key LIKE :searchString', {
        searchString: `%${searchedAffectedPrimaryKey}%`,
      });
    }
    if (!userConnectionEdit) {
      if (userInGroupsIds.length > 0) {
        for (const userId of userInGroupsIds) {
          qb.orWhere('tableLogs.cognitoUserName = :userIdInAdminGroup', { userIdInAdminGroup: userId });
        }
      } else {
        qb.andWhere('tableLogs.cognitoUserName = :currentUserId', { currentUserId: currentUserId });
      }
    }
    qb.orderBy('tableLogs.createdAt', order);
    if (dateFrom && dateTo) {
      qb.andWhere('tableLogs.createdAt >= :date_from', { date_from: dateFrom });
      qb.andWhere('tableLogs.createdAt <= :date_to', { date_to: dateTo });
    }
    if (searchedEmail) {
      qb.andWhere('tableLogs.email = :searchMail', { searchMail: searchedEmail });
    }
    if (logOperationType) {
      qb.andWhere('tableLogs.operationType = :logOperationType', { logOperationType: logOperationType });
    }
    if (logOperationTypes.length > 0) {
      for (const type of logOperationTypes) {
        qb.orWhere('tableLogs.operationType = :type', { type: type });
      }
    }

    const offset = (page - 1) * perPage;
    qb.limit(perPage);
    qb.offset(offset);
    return qb.stream();
  },
};
