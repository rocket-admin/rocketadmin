import { HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { IFindTableWidgets } from './table-widgets-use-cases.interface';
import AbstractUseCase from '../../../common/abstract-use.case';
import { FindTableWidgetsDs } from '../application/data-sctructures/find-table-widgets.ds';
import { FoundTableWidgetsDs } from '../application/data-sctructures/found-table-widgets.ds';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { findTablesInConnectionUtil } from '../../table/utils/find-tables-in-connection.util';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { Messages } from '../../../exceptions/text/messages';
import { buildFoundTableWidgetDs } from '../utils/build-found-table-widget-ds';

@Injectable({ scope: Scope.REQUEST })
export class FindTableWidgetsUseCase
  extends AbstractUseCase<FindTableWidgetsDs, Array<FoundTableWidgetsDs>>
  implements IFindTableWidgets
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: FindTableWidgetsDs): Promise<Array<FoundTableWidgetsDs>> {
    const { connectionId, masterPwd, tableName, userId } = inputData;
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
    const foundTableWidgets = await this._dbContext.tableWidgetsRepository.findTableWidgets(connectionId, tableName);
    return foundTableWidgets.map((widget) => {
      return buildFoundTableWidgetDs(widget);
    });
  }
}
