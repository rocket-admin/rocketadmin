import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { findSensitiveValues, scrub } from '@zapier/secret-scrubber';
import { Repository } from 'typeorm';
import { Constants } from '../../helpers/constants/constants';
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

  //todo remove after reworking logs to storind only changed fields
  public async crateAndSaveNewLogUtilDeprecated(logData: CreateLogRecordDs): Promise<CreatedLogRecordDs> {
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
        if (old_data && typeof old_data === 'object' && old_data.hasOwnProperty(fieldName)) {
          old_data[fieldName] = Constants.REMOVED_SENSITIVE_FIELD_IF_CHANGED;
        }
        if (row && typeof row === 'object' && row.hasOwnProperty(fieldName)) {
          row[fieldName] = Constants.REMOVED_SENSITIVE_FIELD_IF_CHANGED;
        }
      }
    }

    if (typeof old_data === 'string') {
      const sensitiveValues = findSensitiveValues([old_data]);
      if (sensitiveValues && sensitiveValues.length > 0) {
        scrub(old_data, sensitiveValues);
      }
    }

    if (typeof row === 'string') {
      const sensitiveValues = findSensitiveValues([row]);
      scrub(row, sensitiveValues);
    }

    if (old_data && typeof old_data === 'object') {
      const sensitiveValues = findSensitiveValues(old_data);
      if (sensitiveValues && sensitiveValues.length > 0) {
        scrub(old_data, sensitiveValues);
      }
    }

    if (row && typeof row === 'object') {
      const sensitiveValues = findSensitiveValues(row);
      if (sensitiveValues && sensitiveValues.length > 0) {
        scrub(row, sensitiveValues);
      }
    }

    const newLogRecord = buildTableLogsEntity(logData, email);
    const savedLogRecord = await this.tableLogsRepository.save(newLogRecord);
    return buildCreatedLogRecord(savedLogRecord);
  }

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
        if (
          old_data &&
          typeof old_data === 'object' &&
          old_data.hasOwnProperty(fieldName) &&
          row &&
          typeof row === 'object' &&
          row.hasOwnProperty(fieldName)
        ) {
          if (this.compareValues(old_data[fieldName], row[fieldName])) {
            old_data[fieldName] = Constants.REMOVED_SENSITIVE_FIELD_IF_NOT_CHANGED;
            row[fieldName] = Constants.REMOVED_SENSITIVE_FIELD_IF_NOT_CHANGED;
          } else {
            old_data[fieldName] = Constants.REMOVED_SENSITIVE_FIELD_IF_NOT_CHANGED;
            row[fieldName] = Constants.REMOVED_SENSITIVE_FIELD_IF_CHANGED;
          }
        } else {
          if (old_data && typeof old_data === 'object' && old_data.hasOwnProperty(fieldName)) {
            old_data[fieldName] = Constants.REMOVED_SENSITIVE_FIELD_IF_NOT_CHANGED;
          }
          if (row && typeof row === 'object' && row.hasOwnProperty(fieldName)) {
            row[fieldName] = Constants.REMOVED_SENSITIVE_FIELD_IF_CHANGED;
          }
        }
      }
    }

    if (typeof old_data === 'string') {
      const sensitiveValues = findSensitiveValues([old_data]);
      if (sensitiveValues && sensitiveValues.length > 0) {
        scrub(old_data, sensitiveValues);
      }
    }

    if (typeof row === 'string') {
      const sensitiveValues = findSensitiveValues([row]);
      scrub(row, sensitiveValues);
    }

    if (old_data && typeof old_data === 'object') {
      const sensitiveValues = findSensitiveValues(old_data);
      if (sensitiveValues && sensitiveValues.length > 0) {
        scrub(old_data, sensitiveValues);
      }
    }

    if (row && typeof row === 'object') {
      const sensitiveValues = findSensitiveValues(row);
      if (sensitiveValues && sensitiveValues.length > 0) {
        scrub(row, sensitiveValues);
      }
    }

    const newLogRecord = buildTableLogsEntity(logData, email);
    const savedLogRecord = await this.tableLogsRepository.save(newLogRecord);
    return buildCreatedLogRecord(savedLogRecord);
  }

  private compareValues(val1: any, val2: any): boolean {
    if (val1 instanceof Date === true && val2 instanceof Date) {
      const date1 = new Date(val1);
      const date2 = new Date(val2);
      const date1Parsed = date1.getTime();
      const date2Parsed = date2.getTime();
      return date1Parsed === date2Parsed;
    }
    return val1 === val2;
  }
}
