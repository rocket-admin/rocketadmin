import { FindTablesDs } from '../application/data-structures/find-tables.ds';
import { FoundTableDs } from '../application/data-structures/found-table.ds';

export interface IFindTablesInConnection {
  execute(inputData: FindTablesDs): Promise<Array<FoundTableDs>>;
}
