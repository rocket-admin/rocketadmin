import { InTransactionEnum } from '../../../../enums/in-transaction.enum.js';
import { CreatePanelDs } from '../data-structures/create-panel.ds.js';
import { ExecuteSavedDbQueryDs } from '../data-structures/execute-saved-db-query.ds.js';
import { FindAllPanelsDs } from '../data-structures/find-all-panels.ds.js';
import { FindSavedDbQueryDs as FindPanelDs } from '../data-structures/find-panel.ds.js';
import { TestDbQueryDs } from '../data-structures/test-db-query.ds.js';
import { UpdatePanelDs } from '../data-structures/update-panel.ds.js';
import { ExecuteSavedDbQueryResultDto } from '../dto/execute-saved-db-query-result.dto.js';
import { FoundPanelDto } from '../dto/found-saved-db-query.dto.js';
import { TestDbQueryResultDto } from '../dto/test-db-query-result.dto.js';

export interface ICreatePanel {
	execute(inputData: CreatePanelDs, inTransaction: InTransactionEnum): Promise<FoundPanelDto>;
}

export interface IUpdatePanel {
	execute(inputData: UpdatePanelDs, inTransaction: InTransactionEnum): Promise<FoundPanelDto>;
}

export interface IFindPanel {
	execute(inputData: FindPanelDs, inTransaction: InTransactionEnum): Promise<FoundPanelDto>;
}

export interface IFindAllPanels {
	execute(inputData: FindAllPanelsDs, inTransaction: InTransactionEnum): Promise<FoundPanelDto[]>;
}

export interface IDeletePanel {
	execute(inputData: FindPanelDs, inTransaction: InTransactionEnum): Promise<FoundPanelDto>;
}

export interface IExecuteSavedDbQuery {
	execute(inputData: ExecuteSavedDbQueryDs, inTransaction: InTransactionEnum): Promise<ExecuteSavedDbQueryResultDto>;
}

export interface ITestDbQuery {
	execute(inputData: TestDbQueryDs, inTransaction: InTransactionEnum): Promise<TestDbQueryResultDto>;
}
