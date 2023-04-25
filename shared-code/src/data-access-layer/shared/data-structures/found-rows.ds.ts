import { RowsPaginationDS } from './rows-pagination.ds.js';

export class FoundRowsDS {
  data: Array<Record<string, unknown>>;
  pagination: RowsPaginationDS;
  large_dataset: boolean;
}
