import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TableSettingsEntity } from '../table-settings/table-settings.entity';
import { UserEntity } from '../user/user.entity';
import { CreateLogRecordDs } from './application/data-structures/create-log-record.ds';
import { CreatedLogRecordDs } from './application/data-structures/created-log-record.ds';
import { TableLogsEntity } from './table-logs.entity';
import { buildCreatedLogRecord } from './utils/build-created-log-record';
import { buildTableLogsEntity } from './utils/build-table-logs-entity';

@Injectable()
export class TableLogsService {
  constructor(
    @InjectRepository(TableLogsEntity)
    private readonly tableLogsRepository: Repository<TableLogsEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(TableSettingsEntity)
    private readonly tableSettingsRepository: Repository<TableSettingsEntity>,
  ) {}

  public async crateAndSaveNewLogUtil(logData: CreateLogRecordDs): Promise<CreatedLogRecordDs> {
    const { userId, connection, table_name, old_data, row } = logData;
    const foundUser = await this.userRepository.findOne({ where: { id: userId } });
    const { email } = foundUser;
    const tableSettingsQb = this.tableSettingsRepository
      .createQueryBuilder('tableLogs')
      .leftJoinAndSelect('tableLogs.connection_id', 'connection_id')
      .andWhere('tableLogs.connection_id = :connection_id', { connection_id: connection.id })
      .andWhere('tableLogs.table_name = :table_name', { table_name: table_name });

    const tableSettings = await tableSettingsQb.getOne();
    const sensitive_fields = tableSettings?.sensitive_fields;

    if (sensitive_fields && sensitive_fields.length > 0) {
      for (const fieldName of sensitive_fields) {
        if (old_data && old_data.hasOwnProperty(fieldName)) {
          delete old_data[fieldName];
        }
        if (row.hasOwnProperty(fieldName)) {
          delete row[fieldName];
        }
      }
    }

    const newLogRecord = buildTableLogsEntity(logData, email);
    const savedLogRecord = await this.tableLogsRepository.save(newLogRecord);
    return buildCreatedLogRecord(savedLogRecord);
  }
}
