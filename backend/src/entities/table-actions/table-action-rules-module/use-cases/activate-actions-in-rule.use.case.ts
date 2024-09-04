import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IActivateTableActionsInRule } from './action-rules-use-cases.interface.js';
import { ActivatedTableActionsDTO } from '../application/dto/activated-table-actions.dto.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { ActivateEventActionsDS } from '../application/data-structures/activate-rule-actions.ds.js';
import { OperationResultStatusEnum } from '../../../../enums/operation-result-status.enum.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { TableLogsService } from '../../../table-logs/table-logs.service.js';
import { LogOperationTypeEnum } from '../../../../enums/index.js';
import { TableActionActivationService } from '../../table-actions-module/table-action-activation.service.js';

@Injectable()
export class ActivateActionsInEventUseCase
  extends AbstractUseCase<ActivateEventActionsDS, ActivatedTableActionsDTO>
  implements IActivateTableActionsInRule
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private tableLogsService: TableLogsService,
    private tableActionActivationService: TableActionActivationService,
  ) {
    super();
  }

  public async implementation(inputData: ActivateEventActionsDS): Promise<ActivatedTableActionsDTO> {
    const { connection_data, request_body, event_id } = inputData;
    const { connectionId, masterPwd, userId } = connection_data;
    let operationResult = OperationResultStatusEnum.unknown;
    const foundActionsWithCustomEvents =
      await this._dbContext.tableActionRepository.findActionsWithCustomEventsByEventIdConnectionId(
        event_id,
        connectionId,
      );

    if (!foundActionsWithCustomEvents.length) {
      throw new HttpException(
        {
          message: Messages.NO_CUSTOM_ACTIONS_FOUND_FOR_THIS_RULE,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const tableName = foundActionsWithCustomEvents[0].action_rule.table_name;
    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connectionId,
      masterPwd,
    );

    let locationFromResult: string = null;
    const activationResults: Array<{ actionId: string; result: OperationResultStatusEnum }> = [];

    for (const action of foundActionsWithCustomEvents) {
      let primaryKeyValuesArray: Array<Record<string, unknown>> = [];
      try {
        const { receivedOperationResult, receivedPrimaryKeysObj, location } =
          await this.tableActionActivationService.activateTableAction(
            action,
            foundConnection,
            request_body,
            userId,
            tableName,
            null,
          );
        operationResult = receivedOperationResult;
        primaryKeyValuesArray = receivedPrimaryKeysObj;
        if (location) {
          locationFromResult = location;
        }
        activationResults.push({ actionId: action.id, result: operationResult });
      } catch (e) {
        operationResult = OperationResultStatusEnum.unsuccessfully;
        activationResults.push({ actionId: action.id, result: operationResult });
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
          row: { keys: primaryKeyValuesArray },
          old_data: null,
          table_primary_key: JSON.stringify(primaryKeyValuesArray),
        };
        await this.tableLogsService.crateAndSaveNewLogUtil(logRecord);
      }
    }
    return { location: locationFromResult, activationResults };
  }
}
