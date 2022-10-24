import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { Messages } from '../../../exceptions/text/messages';
import { CreatedTableActionDS } from '../application/data-sctructures/created-table-action.ds';
import { buildCreatedTableActionDS } from '../utils/build-created-table-action-ds';
import { IDeleteTableAction } from './table-actions-use-cases.interface';

@Injectable()
export class DeleteTableActionUseCase
  extends AbstractUseCase<string, CreatedTableActionDS>
  implements IDeleteTableAction
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }
  protected async implementation(actionId: string): Promise<CreatedTableActionDS> {
    const tableActionToDelete = await this._dbContext.tableActionRepository.findTableActionById(actionId);
    if (!tableActionToDelete) {
      throw new HttpException({ message: Messages.TABLE_ACTION_NOT_FOUND }, HttpStatus.BAD_REQUEST);
    }
    const deleted = await this._dbContext.tableActionRepository.deleteTableActionUseCase(tableActionToDelete);
    return buildCreatedTableActionDS(deleted);
  }
}
