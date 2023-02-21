import * as fs from 'fs';
import * as path from 'path';
import * as winston from 'winston';
import { CreateLogRecordDto } from './dto/create-log-record.dto';
import { LogOperationTypeEnum, OperationResultStatusEnum } from '../../enums';
import { Config } from '../../shared/config/config';
import { Constants } from '../constants/constants';

export class Logger {
  private static readonly logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
  });

  public static createLogRecord(
    row: string,
    tableName: string,
    email: string,
    operationType: LogOperationTypeEnum,
    operationStatusResult: OperationResultStatusEnum,
    oldData: string,
  ): void {
    const newRecord = new CreateLogRecordDto();
    newRecord.row = row ? row : undefined;
    newRecord.table_name = tableName ? tableName : undefined;
    newRecord.email = email ? email : 'unknown';
    newRecord.operationType = operationType ? operationType : undefined;
    newRecord.operationStatusResult = operationStatusResult ? operationStatusResult : undefined;
    newRecord.old_data = oldData ? oldData : undefined;
    this.printLogRecord(newRecord);
  }

  private static printLogRecord(createLogRecordDto: CreateLogRecordDto): void {
    const log = {
      /* eslint-disable */
      received_data: createLogRecordDto.row,
      table_name: createLogRecordDto.table_name,
      user_email: createLogRecordDto.email,
      operation_time: new Date(),
      operation_type: createLogRecordDto.operationType,
      operation_status: createLogRecordDto.operationStatusResult,
      old_data: createLogRecordDto.old_data,
      /* eslint-enable */
    };
    this.logger.info(log);
    this.writeLogToFile(log);
  }

  private static writeLogToFile(log): void {
    const logOptionFromConfig = Config.getConnectionConfig().saving_logs_option;
    if (!logOptionFromConfig) {
      return;
    }
    log = JSON.stringify(log) + '\n';
    const filePath = path.join(process.cwd(), Constants.DEFAULT_LOGS_DIRNAME, Constants.DEFAULT_LOGS_FILENAME);
    fs.appendFile(filePath, log, (err) => {
      if (err) {
        console.log(err);
      }
    });
  }
}
