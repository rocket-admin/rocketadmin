import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { CreatedTableActionDS } from '../application/data-sctructures/created-table-action.ds.js';
import { buildCreatedTableActionDS } from '../utils/build-created-table-action-ds.js';
import { IFindTableAction } from './table-actions-use-cases.interface.js';

@Injectable()
export class FindTableActionUseCase extends AbstractUseCase<string, CreatedTableActionDS> implements IFindTableAction {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(actionId: string): Promise<CreatedTableActionDS> {
    const foundTableAction = await this._dbContext.tableActionRepository.findTableActionById(actionId);
    if (!foundTableAction) {
      throw new HttpException(
        {
          message: Messages.TABLE_ACTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return buildCreatedTableActionDS(foundTableAction);
  }
}
