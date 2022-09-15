import { EntityRepository, QueryRunner, Repository } from 'typeorm';
import { TableLogsEntity } from '../table-logs.entity';
import { IFindLogsOptions, ITableLogsRepository } from './table-logs-repository.interface';
import { CreateLogRecordDs } from '../application/data-structures/create-log-record.ds';
import { CreatedLogRecordDs } from '../application/data-structures/created-log-record.ds';
import { UserEntity } from '../../user/user.entity';
import { buildTableLogsEntity } from '../utils/build-table-logs-entity';
import { buildCreatedLogRecord } from '../utils/build-created-log-record';
import { FoundLogsEntities } from '../application/data-structures/found-logs.ds';

@EntityRepository(TableLogsEntity)
export class TableLogsRepository extends Repository<TableLogsEntity> implements ITableLogsRepository {
  constructor() {
    super();
  }

  public async createLogRecord(logData: CreateLogRecordDs): Promise<CreatedLogRecordDs> {
    const { userId } = logData;
    const userQb = this.createQueryBuilder(undefined, this.getCurrentQueryRunner())
      .select('user')
      .from(UserEntity, 'user')
      .where('user.id = id', { id: userId });
    const { email } = await userQb.getOne();
    const newLogRecord = buildTableLogsEntity(logData, email);
    const savedLogRecord = await this.save(newLogRecord);
    return buildCreatedLogRecord(savedLogRecord);
  }

  public async findLogs(findOptions: IFindLogsOptions): Promise<FoundLogsEntities> {
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
    } = findOptions;
    const qb = this.createQueryBuilder(undefined, this.getCurrentQueryRunner())
      .select('tableLogs')
      .from(TableLogsEntity, 'tableLogs')
      .leftJoinAndSelect('tableLogs.connection_id', 'connection_id');
    qb.andWhere('tableLogs.connection_id = :connection_id', { connection_id: connectionId });

    if (tableName) {
      qb.andWhere('tableLogs.table_name = :table_name', { table_name: tableName });
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
  }

  private getCurrentQueryRunner(): QueryRunner {
    return this.manager.queryRunner;
  }
}
