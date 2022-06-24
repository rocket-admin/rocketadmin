import { CreateLogRecordDs } from '../application/data-structures/create-log-record.ds';
import { CreatedLogRecordDs } from '../application/data-structures/created-log-record.ds';
import { buildTableLogsEntity } from './build-table-logs-entity';
import { buildCreatedLogRecord } from './build-created-log-record';
import { getRepository } from 'typeorm';
import { UserEntity } from '../../user/user.entity';
import { TableLogsEntity } from '../table-logs.entity';

export async function crateAndSaveNewLogUtil(logData: CreateLogRecordDs): Promise<CreatedLogRecordDs> {
  const { userId } = logData;
  const userRepository = await getRepository(UserEntity);
  const tableLogsRepository = await getRepository(TableLogsEntity);
  const foundUser = await userRepository.findOne({ id: userId });
  const { email } = foundUser;
  const newLogRecord = buildTableLogsEntity(logData, email);
  const savedLogRecord = await tableLogsRepository.save(newLogRecord);
  return buildCreatedLogRecord(savedLogRecord);
}
