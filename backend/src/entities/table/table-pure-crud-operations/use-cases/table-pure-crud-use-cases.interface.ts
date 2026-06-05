import { InTransactionEnum } from '../../../../enums/in-transaction.enum.js';
import { PureCreateRowDs } from '../application/data-structures/pure-create-row.ds.js';
import { PureCrudRowResponseDs } from '../application/data-structures/pure-crud-row-response.ds.js';
import { PureDeleteRowDs } from '../application/data-structures/pure-delete-row.ds.js';
import { PureFoundRowsResponseDs } from '../application/data-structures/pure-found-rows-response.ds.js';
import { PureGetRowsDs } from '../application/data-structures/pure-get-rows.ds.js';
import { PureReadRowDs } from '../application/data-structures/pure-read-row.ds.js';
import { PureUpdateRowDs } from '../application/data-structures/pure-update-row.ds.js';

export interface IPureCreateRowInTable {
	execute(inputData: PureCreateRowDs, inTransaction: InTransactionEnum): Promise<PureCrudRowResponseDs>;
}

export interface IPureReadRowFromTable {
	execute(inputData: PureReadRowDs, inTransaction: InTransactionEnum): Promise<PureCrudRowResponseDs>;
}

export interface IPureUpdateRowInTable {
	execute(inputData: PureUpdateRowDs, inTransaction: InTransactionEnum): Promise<PureCrudRowResponseDs>;
}

export interface IPureDeleteRowFromTable {
	execute(inputData: PureDeleteRowDs, inTransaction: InTransactionEnum): Promise<PureCrudRowResponseDs>;
}

export interface IPureGetRowsFromTable {
	execute(inputData: PureGetRowsDs, inTransaction: InTransactionEnum): Promise<PureFoundRowsResponseDs>;
}
