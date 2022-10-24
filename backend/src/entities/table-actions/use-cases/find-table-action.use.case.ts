import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { Messages } from '../../../exceptions/text/messages';
import { CreatedTableActionDS } from '../application/data-sctructures/created-table-action.ds';
import { buildCreatedTableActionDS } from '../utils/build-created-table-action-ds';
import { IFindTableAction } from './table-actions-use-cases.interface';

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
    console.log("🚀 ~ file: find-table-action.use.case.ts ~ line 21 ~ FindTableActionUseCase ~ implementation ~ foundTableAction", foundTableAction)
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
