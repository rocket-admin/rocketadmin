import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { ICreateTableTriggers } from './table-triggers-use-cases.interface.js';
import { FoundTableTriggersWithActionsDTO } from '../application/dto/found-table-triggers-with-actions.dto.js';
import { CreateTableTriggersDS } from '../application/data-structures/create-table-triggers.ds.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { TableTriggersEntity } from '../table-triggers.entity.js';
import { buildFoundTableTriggerDto } from '../utils/build-found-table-triggers-dto.util.js';

@Injectable({ scope: Scope.REQUEST })
export class CreateTableTriggersUseCase
  extends AbstractUseCase<CreateTableTriggersDS, FoundTableTriggersWithActionsDTO>
  implements ICreateTableTriggers
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: CreateTableTriggersDS): Promise<FoundTableTriggersWithActionsDTO> {
    const { connectionId, tableName, actions_ids, trigger_events } = inputData;
    const foundConnection = await this._dbContext.connectionRepository.findOne({ where: { id: connectionId } });

    if (!foundConnection) {
      throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
    }

    if (!foundConnection.signing_key) {
      foundConnection.signing_key = Encryptor.generateRandomString(40);
      await this._dbContext.connectionRepository.saveUpdatedConnection(foundConnection);
    }

    const foundTableActions = await this._dbContext.tableActionRepository.findTableActionsByIds(actions_ids);
    if (foundTableActions.length !== actions_ids.length) {
      throw new NotFoundException(Messages.TABLE_ACTION_NOT_FOUND);
    }

    const newTableTriggers = new TableTriggersEntity();
    newTableTriggers.connection = foundConnection;
    newTableTriggers.table_name = tableName;
    newTableTriggers.trigger_events = trigger_events;
    newTableTriggers.table_actions = [];

    const savedTrigger = await this._dbContext.tableTriggersRepository.saveNewOrUpdatedTriggers(newTableTriggers);
    savedTrigger.table_actions.push(...foundTableActions);
    await this._dbContext.tableTriggersRepository.saveNewOrUpdatedTriggers(savedTrigger);
    return buildFoundTableTriggerDto(newTableTriggers);
  }
}
