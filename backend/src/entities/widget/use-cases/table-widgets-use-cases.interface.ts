import { FindTableWidgetsDs } from '../application/data-sctructures/find-table-widgets.ds';
import { FoundTableWidgetsDs } from '../application/data-sctructures/found-table-widgets.ds';
import { CreateTableWidgetsDs } from '../application/data-sctructures/create-table-widgets.ds';
import { InTransactionEnum } from '../../../enums';

export interface IFindTableWidgets {
  execute(inputData: FindTableWidgetsDs, inTransaction: InTransactionEnum): Promise<Array<FoundTableWidgetsDs>>;
}

export interface ICreateUpdateDeleteTableWidgets {
  execute(inputData: CreateTableWidgetsDs, inTransaction: InTransactionEnum): Promise<Array<FoundTableWidgetsDs>>;
}
