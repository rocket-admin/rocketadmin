import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { CreatedTableActionDS } from '../application/data-sctructures/created-table-action.ds.js';
import { UpdateTableActionDS } from '../application/data-sctructures/update-table-action.ds.js';
import { buildCreatedTableActionDS } from '../utils/build-created-table-action-ds.js';
import { buildNewTableActionEntity } from '../utils/build-new-table-action-entity.util.js';
import { IUpdateTableAction } from './table-actions-use-cases.interface.js';

@Injectable()
export class UpdateTableActionUseCase
  extends AbstractUseCase<UpdateTableActionDS, CreatedTableActionDS>
  implements IUpdateTableAction
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: UpdateTableActionDS): Promise<CreatedTableActionDS> {
    const { actionId } = inputData;
    const foundTableActionEntity = await this._dbContext.tableActionRepository.findTableActionById(actionId);
    if (!foundTableActionEntity) {
      throw new HttpException({ message: Messages.TABLE_ACTION_NOT_FOUND }, HttpStatus.BAD_REQUEST);
    }

    const updatingTableAction = buildNewTableActionEntity(inputData);
    for (const key in updatingTableAction) {
      // eslint-disable-next-line security/detect-object-injection
      if (updatingTableAction[key] === undefined) {
        // eslint-disable-next-line security/detect-object-injection
        delete updatingTableAction[key];
      }
    }
    const updated = Object.assign(foundTableActionEntity, updatingTableAction);
    const savedAction = await this._dbContext.tableActionRepository.saveNewOrUpdatedTableAction(updated);
    return buildCreatedTableActionDS(savedAction);
  }
}
