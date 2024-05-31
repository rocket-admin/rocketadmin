import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { CreateTableTriggersDS } from '../application/data-structures/create-table-triggers.ds.js';
import { FindTableTriggersDS } from '../application/data-structures/find-all-table-triggers.ds.js';
import { UpdateTableTriggersDS } from '../application/data-structures/update-table-triggers.ds.js';
import { FoundTableTriggersWithActionsDTO } from '../application/dto/found-table-triggers-with-actions.dto.js';

export interface IFindAllTableTriggers {
  execute(inputData: FindTableTriggersDS): Promise<Array<FoundTableTriggersWithActionsDTO>>;
}

export interface ICreateTableTriggers {
  execute(
    inputData: CreateTableTriggersDS,
    inTransaction: InTransactionEnum,
  ): Promise<FoundTableTriggersWithActionsDTO>;
}

export interface IUpdateTableTriggers {
  execute(
    inputData: UpdateTableTriggersDS,
    inTransaction: InTransactionEnum,
  ): Promise<FoundTableTriggersWithActionsDTO>;
}

export interface IDeleteTableTriggers {
  execute(triggerId: string, inTransaction: InTransactionEnum): Promise<FoundTableTriggersWithActionsDTO>;
}

export interface IFindTableTrigger {
  execute(triggerId: string): Promise<FoundTableTriggersWithActionsDTO>;
}
