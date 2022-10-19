import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  public async crateAndSaveNewLogUtil(logData: CreateLogRecordDs): Promise<CreatedLogRecordDs> {
    const { userId } = logData;
    const foundUser = await this.userRepository.findOne({ where: { id: userId } });
    const { email } = foundUser;
    const newLogRecord = buildTableLogsEntity(logData, email);
    const savedLogRecord = await this.tableLogsRepository.save(newLogRecord);
    return buildCreatedLogRecord(savedLogRecord);
  }
}
