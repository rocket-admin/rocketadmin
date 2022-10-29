import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { Messages } from '../../../exceptions/text/messages';
import { CreatedTableActionDS } from '../application/data-sctructures/created-table-action.ds';
import { UpdateTableActionDS } from '../application/data-sctructures/update-table-action.ds';
import { buildCreatedTableActionDS } from '../utils/build-created-table-action-ds';
import { buildNewTableActionEntity } from '../utils/build-new-table-action-entity.util';
import { IUpdateTableAction } from './table-actions-use-cases.interface';

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
    const updated = Object.assign(foundTableActionEntity, updatingTableAction);
    const savedAction = await this._dbContext.tableActionRepository.saveNewOrOupdatedTableAction(updated);
    return buildCreatedTableActionDS(savedAction);
  }
}
