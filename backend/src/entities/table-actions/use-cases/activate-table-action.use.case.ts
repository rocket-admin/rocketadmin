import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { LogOperationTypeEnum, OperationResultStatusEnum } from '../../../enums/index.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { TableLogsService } from '../../table-logs/table-logs.service.js';
import { ActivateTableActionDS } from '../application/data-sctructures/activate-table-action.ds.js';
import { ActivatedTableActionDS } from '../application/data-sctructures/activated-table-action.ds.js';
import { IActivateTableAction } from './table-actions-use-cases.interface.js';
import { activateTableAction } from '../utils/activate-table-action.util.js';

@Injectable()
export class ActivateTableActionUseCase
  extends AbstractUseCase<ActivateTableActionDS, ActivatedTableActionDS>
  implements IActivateTableAction
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private tableLogsService: TableLogsService,
  ) {
    super();
  }

  protected async implementation(inputData: ActivateTableActionDS): Promise<ActivatedTableActionDS> {
    let operationResult = OperationResultStatusEnum.unknown;
    const { actionId, request_body, connectionId, masterPwd, tableName, userId, confirmed } = inputData;
    const foundTableAction = await this._dbContext.tableActionRepository.findTableActionById(actionId);
    if (!foundTableAction) {
      throw new HttpException(
        {
          message: Messages.TABLE_ACTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (foundTableAction.require_confirmation && !confirmed) {
      throw new HttpException(
        {
          message: Messages.TABLE_ACTION_CONFIRMATION_REQUIRED,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connectionId,
      masterPwd,
    );

    let primaryKeysObj = null;
    try {
      const { receivedOperationResult, location, receivedPrimaryKeysObj } = await activateTableAction(
        foundTableAction,
        foundConnection,
        request_body,
        userId,
        tableName,
      );
      primaryKeysObj = receivedPrimaryKeysObj;
      operationResult = receivedOperationResult;
      return { location };
    } catch (e) {
      operationResult = OperationResultStatusEnum.unsuccessfully;
      throw new HttpException(
        {
          message: e.message,
        },
        e.response?.status || HttpStatus.BAD_REQUEST,
      );
    } finally {
      const logRecord = {
        table_name: tableName,
        userId: userId,
        connection: foundConnection,
        operationType: LogOperationTypeEnum.actionActivated,
        operationStatusResult: operationResult,
        row: primaryKeysObj,
        old_data: null,
      };
      await this.tableLogsService.crateAndSaveNewLogUtil(logRecord);
    }
  }
}
