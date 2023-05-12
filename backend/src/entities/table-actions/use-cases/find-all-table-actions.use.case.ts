import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { findTablesInConnectionUtil } from '../../table/utils/find-tables-in-connection.util.js';
import { CreatedTableActionDS } from '../application/data-sctructures/created-table-action.ds.js';
import { FindTableActionsDS } from '../application/data-sctructures/find-table-actions.ds.js';
import { buildCreatedTableActionDS } from '../utils/build-created-table-action-ds.js';
import { IFindAllTableActions } from './table-actions-use-cases.interface.js';

@Injectable()
export class FindTableActionsUseCase
  extends AbstractUseCase<FindTableActionsDS, Array<CreatedTableActionDS>>
  implements IFindAllTableActions
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: FindTableActionsDS): Promise<Array<CreatedTableActionDS>> {
    const { connectionId, tableName, masterPwd, userId } = inputData;
    const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
    const tablesInConnection = await findTablesInConnectionUtil(connection, userId, null);
    if (!tablesInConnection.includes(tableName)) {
      throw new HttpException(
        {
          message: Messages.TABLE_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const foundTableActions = await this._dbContext.tableActionRepository.findTableActions(connectionId, tableName);
    return foundTableActions.map((action) => buildCreatedTableActionDS(action));
  }
}
