import { StreamableFile } from '@nestjs/common';
import { InTransactionEnum } from '../../../enums/index.js';
import { FindLogsDs } from '../application/data-structures/find-logs.ds.js';
import { FoundLogsDs } from '../application/data-structures/found-logs.ds.js';

export interface IFindLogs {
	execute(inputData: FindLogsDs, inTransaction: InTransactionEnum): Promise<FoundLogsDs>;
}

export interface IExportLogsAsCsv {
	execute(inputData: FindLogsDs): Promise<StreamableFile>;
}
