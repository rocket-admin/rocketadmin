import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { UpdateTableTriggersDS } from '../application/data-structures/update-table-triggers.ds.js';
import { FoundTableTriggersWithActionsDTO } from '../application/dto/found-table-triggers-with-actions.dto.js';
import { IUpdateTableTriggers } from './table-triggers-use-cases.interface.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { buildFoundTableTriggerDto } from '../utils/build-found-table-triggers-dto.util.js';

@Injectable({ scope: Scope.REQUEST })
export class UpdateTableTriggersUseCase
  extends AbstractUseCase<UpdateTableTriggersDS, FoundTableTriggersWithActionsDTO>
  implements IUpdateTableTriggers
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: UpdateTableTriggersDS): Promise<FoundTableTriggersWithActionsDTO> {
    const { actions_ids, triggersId, table_name } = inputData;
    const foundTableTriggers = await this._dbContext.tableTriggersRepository.findOne({ where: { id: triggersId } });
    if (!foundTableTriggers) {
      throw new NotFoundException(Messages.TABLE_TRIGGERS_NOT_FOUND_FOR_UPDATE);
    }
    const foundTableActions = await this._dbContext.tableActionRepository.findTableActionsByIds(actions_ids);
    if (foundTableActions.length !== actions_ids.length) {
      throw new NotFoundException(Messages.TABLE_ACTION_NOT_FOUND);
    }
    foundTableTriggers.table_actions = foundTableActions;
    foundTableTriggers.table_name = table_name;
    const savedTriggers = await this._dbContext.tableTriggersRepository.saveNewOrUpdatedTriggers(foundTableTriggers);
    return buildFoundTableTriggerDto(savedTriggers);
  }
}
