import { InTransactionEnum } from '../../../../enums/in-transaction.enum.js';
import { CreateSavedDbQueryDs } from '../data-structures/create-saved-db-query.ds.js';
import { ExecuteSavedDbQueryDs } from '../data-structures/execute-saved-db-query.ds.js';
import { FindAllSavedDbQueriesDs } from '../data-structures/find-all-saved-db-queries.ds.js';
import { FindSavedDbQueryDs } from '../data-structures/find-saved-db-query.ds.js';
import { TestDbQueryDs } from '../data-structures/test-db-query.ds.js';
import { UpdateSavedDbQueryDs } from '../data-structures/update-saved-db-query.ds.js';
import { ExecuteSavedDbQueryResultDto } from '../dto/execute-saved-db-query-result.dto.js';
import { FoundSavedDbQueryDto } from '../dto/found-saved-db-query.dto.js';
import { TestDbQueryResultDto } from '../dto/test-db-query-result.dto.js';

export interface ICreateSavedDbQuery {
	execute(inputData: CreateSavedDbQueryDs, inTransaction: InTransactionEnum): Promise<FoundSavedDbQueryDto>;
}

export interface IUpdateSavedDbQuery {
	execute(inputData: UpdateSavedDbQueryDs, inTransaction: InTransactionEnum): Promise<FoundSavedDbQueryDto>;
}

export interface IFindSavedDbQuery {
	execute(inputData: FindSavedDbQueryDs, inTransaction: InTransactionEnum): Promise<FoundSavedDbQueryDto>;
}

export interface IFindAllSavedDbQueries {
	execute(inputData: FindAllSavedDbQueriesDs, inTransaction: InTransactionEnum): Promise<FoundSavedDbQueryDto[]>;
}

export interface IDeleteSavedDbQuery {
	execute(inputData: FindSavedDbQueryDs, inTransaction: InTransactionEnum): Promise<FoundSavedDbQueryDto>;
}

export interface IExecuteSavedDbQuery {
	execute(inputData: ExecuteSavedDbQueryDs, inTransaction: InTransactionEnum): Promise<ExecuteSavedDbQueryResultDto>;
}

export interface ITestDbQuery {
	execute(inputData: TestDbQueryDs, inTransaction: InTransactionEnum): Promise<TestDbQueryResultDto>;
}
