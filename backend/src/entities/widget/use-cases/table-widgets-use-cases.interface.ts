import { FindTableWidgetsDs } from '../application/data-sctructures/find-table-widgets.ds';
import { FoundTableWidgetsDs } from '../application/data-sctructures/found-table-widgets.ds';
import { CreateTableWidgetsDs } from '../application/data-sctructures/create-table-widgets.ds';

export interface IFindTableWidgets {
  execute(inputData: FindTableWidgetsDs): Promise<Array<FoundTableWidgetsDs>>;
}

export interface ICreateUpdateDeleteTableWidgets {
  execute(inputData: CreateTableWidgetsDs): Promise<Array<FoundTableWidgetsDs>>;
}
