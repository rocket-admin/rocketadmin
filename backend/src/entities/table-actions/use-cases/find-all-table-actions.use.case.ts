import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { Messages } from '../../../exceptions/text/messages';
import { findTablesInConnectionUtil } from '../../table/utils/find-tables-in-connection.util';
import { CreatedTableActionDS } from '../application/data-sctructures/created-table-action.ds';
import { FindTableActionsDS } from '../application/data-sctructures/find-table-actions.ds';
import { buildCreatedTableActionDS } from '../utils/build-created-table-action-ds';
import { IFindAllTableActions } from './table-actions-use-cases.interface';

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
