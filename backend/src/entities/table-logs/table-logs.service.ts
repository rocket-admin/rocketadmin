import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { findSensitiveValues, scrub } from '@zapier/secret-scrubber';
import PQueue from 'p-queue';
import { Repository } from 'typeorm';
import { LogOperationTypeEnum, OperationResultStatusEnum } from '../../enums/index.js';
import { Constants } from '../../helpers/constants/constants.js';
import { ConnectionEntity } from '../connection/connection.entity.js';
import { TableSettingsEntity } from '../table-settings/table-settings.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { CreateLogRecordDs } from './application/data-structures/create-log-record.ds.js';
import { CreatedLogRecordDs } from './application/data-structures/created-log-record.ds.js';
import { TableLogsEntity } from './table-logs.entity.js';
import { buildCreatedLogRecord } from './utils/build-created-log-record.js';
import { buildTableLogsEntity } from './utils/build-table-logs-entity.js';
import { ConnectionPropertiesEntity } from '../connection-properties/connection-properties.entity.js';

@Injectable()
export class TableLogsService {
  constructor(
    @InjectRepository(TableLogsEntity)
    private readonly tableLogsRepository: Repository<TableLogsEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(TableSettingsEntity)
    private readonly tableSettingsRepository: Repository<TableSettingsEntity>,
    @InjectRepository(ConnectionPropertiesEntity)
    private readonly connectionPropertiesRepository: Repository<ConnectionPropertiesEntity>,
  ) {}

  public async crateAndSaveNewLogUtil(logData: CreateLogRecordDs): Promise<CreatedLogRecordDs> {
    const { userId, connection, table_name, old_data, row } = logData;
    const isAuditEnabled = await this.isTableAuditEnabledInConnectionProperties(connection.id);
    if (!isAuditEnabled) {
      return;
    }
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
          // eslint-disable-next-line security/detect-object-injection
          if (this.compareValues(old_data[fieldName], row[fieldName])) {
            // eslint-disable-next-line security/detect-object-injection
            old_data[fieldName] = Constants.REMOVED_SENSITIVE_FIELD_IF_CHANGED;
            // eslint-disable-next-line security/detect-object-injection
            row[fieldName] = Constants.REMOVED_SENSITIVE_FIELD_IF_CHANGED;
          } else {
            // eslint-disable-next-line security/detect-object-injection
            old_data[fieldName] = Constants.REMOVED_SENSITIVE_FIELD_IF_NOT_CHANGED;
            // eslint-disable-next-line security/detect-object-injection
            row[fieldName] = Constants.REMOVED_SENSITIVE_FIELD_IF_CHANGED;
          }
        } else {
          if (old_data && typeof old_data === 'object' && old_data.hasOwnProperty(fieldName)) {
            // eslint-disable-next-line security/detect-object-injection
            old_data[fieldName] = Constants.REMOVED_SENSITIVE_FIELD_IF_NOT_CHANGED;
          }
          if (row && typeof row === 'object' && row.hasOwnProperty(fieldName)) {
            // eslint-disable-next-line security/detect-object-injection
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

  public async createAndSaveNewLogsUtil(
    logsData: Array<{
      operationStatusResult: OperationResultStatusEnum;
      row: Record<string, unknown>;
      old_data: Record<string, unknown>;
      affected_primary_key: string;
    }>,
    userId: string,
    connection: ConnectionEntity,
    table_name: string,
    operationType: LogOperationTypeEnum,
  ): Promise<Array<CreatedLogRecordDs>> {
    const isAuditEnabled = await this.isTableAuditEnabledInConnectionProperties(connection.id);
    if (!isAuditEnabled) {
      return;
    }
    const foundUser = await this.userRepository.findOne({ where: { id: userId } });
    const { email } = foundUser;
    const tableSettingsQb = this.tableSettingsRepository
      .createQueryBuilder('tableLogs')
      .leftJoinAndSelect('tableLogs.connection_id', 'connection_id')
      .andWhere('tableLogs.connection_id = :connection_id', { connection_id: connection.id })
      .andWhere('tableLogs.table_name = :table_name', { table_name: table_name });

    const tableSettings = await tableSettingsQb.getOne();
    const sensitive_fields = tableSettings?.sensitive_fields || [];

    const tableLogsEntities: Array<TableLogsEntity> = [];
    for (const logData of logsData) {
      const { row, old_data } = logData;
      for (const fieldName of sensitive_fields) {
        if (
          old_data &&
          typeof old_data === 'object' &&
          old_data.hasOwnProperty(fieldName) &&
          row &&
          typeof row === 'object' &&
          row.hasOwnProperty(fieldName)
        ) {
          // eslint-disable-next-line security/detect-object-injection
          if (this.compareValues(old_data[fieldName], row[fieldName])) {
            // eslint-disable-next-line security/detect-object-injection
            old_data[fieldName] = Constants.REMOVED_SENSITIVE_FIELD_IF_CHANGED;
            // eslint-disable-next-line security/detect-object-injection
            row[fieldName] = Constants.REMOVED_SENSITIVE_FIELD_IF_CHANGED;
          } else {
            // eslint-disable-next-line security/detect-object-injection
            old_data[fieldName] = Constants.REMOVED_SENSITIVE_FIELD_IF_NOT_CHANGED;
            // eslint-disable-next-line security/detect-object-injection
            row[fieldName] = Constants.REMOVED_SENSITIVE_FIELD_IF_CHANGED;
          }
        } else {
           
          if (old_data && typeof old_data === 'object' && old_data.hasOwnProperty(fieldName)) {
            // eslint-disable-next-line security/detect-object-injection
            old_data[fieldName] = Constants.REMOVED_SENSITIVE_FIELD_IF_NOT_CHANGED;
          }
           
          if (row && typeof row === 'object' && row.hasOwnProperty(fieldName)) {
            // eslint-disable-next-line security/detect-object-injection
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
      const loggedData: CreateLogRecordDs = {
        ...logData,
        connection,
        table_name,
        userId,
        operationType,
      };
      const newLogRecord = buildTableLogsEntity(loggedData, email);
      tableLogsEntities.push(newLogRecord);
    }
    const queue = new PQueue({ concurrency: 2 });
    const createdLogs: Array<CreatedLogRecordDs | void> = await Promise.all(
      tableLogsEntities.map(async (newLogRecord) => {
        return await queue.add(async () => {
          const savedLogRecord = await this.tableLogsRepository.save(newLogRecord);
          return buildCreatedLogRecord(savedLogRecord);
        });
      }),
    );
    return createdLogs.filter((log) => log) as Array<CreatedLogRecordDs>;
  }

  private async isTableAuditEnabledInConnectionProperties(connectionId: string): Promise<boolean> {
    const connectionProperties = await this.connectionPropertiesRepository.findOne({
      where: { connection: { id: connectionId } },
    });
    if (!connectionProperties) {
      return true;
    }
    return connectionProperties.tables_audit;
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
