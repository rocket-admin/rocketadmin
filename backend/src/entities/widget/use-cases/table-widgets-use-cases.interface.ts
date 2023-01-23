import { FindTableWidgetsDs } from '../application/data-sctructures/find-table-widgets.ds.js';
import { FoundTableWidgetsDs } from '../application/data-sctructures/found-table-widgets.ds.js';
import { CreateTableWidgetsDs } from '../application/data-sctructures/create-table-widgets.ds.js';
import { InTransactionEnum } from '../../../enums/index.js';

export interface IFindTableWidgets {
  execute(inputData: FindTableWidgetsDs, inTransaction: InTransactionEnum): Promise<Array<FoundTableWidgetsDs>>;
}

export interface ICreateUpdateDeleteTableWidgets {
  execute(inputData: CreateTableWidgetsDs, inTransaction: InTransactionEnum): Promise<Array<FoundTableWidgetsDs>>;
}
