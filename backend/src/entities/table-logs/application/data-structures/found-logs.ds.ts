import { PaginationDs } from '../../../table/application/data-structures/pagination.ds.js';
import { LogOperationTypeEnum, OperationResultStatusEnum } from '../../../../enums/index.js';
import { TableLogsEntity } from '../../table-logs.entity.js';
import { ApiProperty } from '@nestjs/swagger';

export class FoundLogRecordDs {
  @ApiProperty()
  cognitoUserName: string;

  @ApiProperty()
  connection_id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  email: string;

  @ApiProperty()
  old_data: string;

  @ApiProperty()
  affected_primary_key: string;

  @ApiProperty({ enum: OperationResultStatusEnum })
  operationStatusResult: OperationResultStatusEnum;

  @ApiProperty({ enum: LogOperationTypeEnum })
  operationType: LogOperationTypeEnum;

  @ApiProperty()
  received_data: string;

  @ApiProperty()
  table_name: string;
}

export class FoundLogsDs {
  @ApiProperty({ isArray: true, type: FoundLogRecordDs })
  logs: Array<FoundLogRecordDs>;

  @ApiProperty({ type: PaginationDs })
  pagination: PaginationDs;
}

export class FoundLogsEntities {
  logs: Array<TableLogsEntity>;
  pagination: PaginationDs;
}
