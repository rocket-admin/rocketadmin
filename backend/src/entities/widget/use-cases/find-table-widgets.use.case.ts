import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { findTablesInConnectionUtil } from '../../table/utils/find-tables-in-connection.util.js';
import { FindTableWidgetsDs } from '../application/data-sctructures/find-table-widgets.ds.js';
import { FoundTableWidgetsDs } from '../application/data-sctructures/found-table-widgets.ds.js';
import { buildFoundTableWidgetDs } from '../utils/build-found-table-widget-ds.js';
import { IFindTableWidgets } from './table-widgets-use-cases.interface.js';

@Injectable()
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
