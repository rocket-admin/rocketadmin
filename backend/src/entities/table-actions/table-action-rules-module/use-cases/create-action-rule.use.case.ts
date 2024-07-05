import { BadRequestException, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { ICreateActionRule } from './action-rules-use-cases.interface.js';
import { CreateActionRuleDS, CreateTableActionData } from '../application/data-structures/create-action-rules.ds.js';
import { FoundActionRulesWithActionsAndEventsDTO } from '../application/dto/found-action-rules-with-actions-and-events.dto.js';
import { TableActionMethodEnum } from '../../../../enums/table-action-method-enum.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { buildEmptyActionRule } from '../utils/build-empty-action-rule.util.js';
import { ValidationHelper } from '../../../../helpers/validators/validation-helper.js';
import { buildTableActionWithRule } from '../../table-actions-module/utils/build-table-action-with-rule.util.js';
import { buildActionEventWithRule } from '../../table-action-events-module/utils/build-action-event-with-rule.util.js';
import { buildFoundActionRulesWithActionsAndEventsDTO } from '../utils/build-found-action-rules-with-actions-and-events-dto.util.js';
import { validateStringWithEnum } from '../../../../helpers/validators/validate-string-with-enum.js';

@Injectable({ scope: Scope.REQUEST })
export class CreateActionRuleUseCase
  extends AbstractUseCase<CreateActionRuleDS, FoundActionRulesWithActionsAndEventsDTO>
  implements ICreateActionRule
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: CreateActionRuleDS): Promise<FoundActionRulesWithActionsAndEventsDTO> {
    const { connection_data, action_events_data, rule_data, table_actions_data } = inputData;
    const { connectionId, masterPwd, userId } = connection_data;
    const { table_name } = rule_data;

    await this.validateActionEmailsOrThrowException(table_actions_data, userId);
    await this.validateTableNameOrThrowException(table_name, connectionId, masterPwd);
    await this.validateTableActionDataOrThrowException(table_actions_data);

    const foundConnection = await this._dbContext.connectionRepository.findOne({ where: { id: connectionId } });
    const newActionRule = buildEmptyActionRule(rule_data, foundConnection);
    const savedActionRule = await this._dbContext.actionRulesRepository.saveNewOrUpdatedActionRule(newActionRule);

    const savedTableActions = await Promise.all(
      table_actions_data.map((tableAction) => {
        const newTableAction = buildTableActionWithRule(tableAction, savedActionRule);
        return this._dbContext.tableActionRepository.saveNewOrUpdatedTableAction(newTableAction);
      }),
    );

    const savedActionEvents = await Promise.all(
      action_events_data.map((actionEvent) => {
        const newActionEvent = buildActionEventWithRule(actionEvent, savedActionRule);
        return this._dbContext.actionEventsRepository.saveNewOrUpdatedActionEvent(newActionEvent);
      }),
    );
    savedActionRule.action_events = savedActionEvents;
    savedActionRule.table_actions = savedTableActions;
    return buildFoundActionRulesWithActionsAndEventsDTO(savedActionRule);
  }

  private async validateActionEmailsOrThrowException(
    table_actions_data: Array<CreateTableActionData>,
    userId: string,
  ): Promise<void> {
    const companyWithUsers = await this._dbContext.companyInfoRepository.findUserCompanyWithUsers(userId);
    const usersInCompanyEmails = companyWithUsers.users.map((user) => user.email);
    const emailsFromEmailActions: Array<string> = table_actions_data.reduce((acc, table_action) => {
      if (table_action.action_method === TableActionMethodEnum.EMAIL) {
        return acc.concat(table_action.action_emails);
      }
      return acc;
    }, []);
    const emailsNotInCompany = emailsFromEmailActions.filter((email) => !usersInCompanyEmails.includes(email));
    if (emailsNotInCompany.length > 0) {
      throw new BadRequestException(Messages.EMAILS_NOT_IN_COMPANY(emailsNotInCompany));
    }
    const emailsNotVerified = emailsFromEmailActions.filter((email) => {
      const foundUser = companyWithUsers.users.find((user) => user.email === email);
      if (foundUser.id === userId) {
        return false;
      }
      return !foundUser.isActive;
    });
    if (emailsNotVerified.length > 0) {
      throw new BadRequestException(Messages.USERS_NOT_VERIFIED(emailsNotVerified));
    }
  }

  private async validateTableNameOrThrowException(
    tableName: string,
    connectionId: string,
    masterPwd: string,
  ): Promise<void> {
    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connectionId,
      masterPwd,
    );
    const dao = getDataAccessObject(foundConnection);
    const tablesInConnection = await dao.getTablesFromDB();
    const tableNamesInConnection = tablesInConnection.map((table) => table.tableName);
    if (!tableNamesInConnection.includes(tableName)) {
      throw new BadRequestException(Messages.TABLE_WITH_NAME_NOT_EXISTS(tableName));
    }
  }

  private async validateTableActionDataOrThrowException(tableActions: Array<CreateTableActionData>): Promise<void> {
    for (const action of tableActions) {
      if (action.action_method === TableActionMethodEnum.EMAIL) {
        if (!action.action_emails || action.action_emails.length === 0) {
          throw new BadRequestException(Messages.EMAILS_REQUIRED_FOR_EMAIL_ACTION);
        }
      }
      if (action.action_method === TableActionMethodEnum.SLACK) {
        if (!action.action_slack_url) {
          throw new BadRequestException(Messages.SLACK_URL_MISSING);
        }
      }
      if (!validateStringWithEnum(action.action_method, TableActionMethodEnum)) {
        throw new BadRequestException(Messages.INVALID_ACTION_METHOD(action.action_method));
      }
      if (action.action_method === TableActionMethodEnum.URL) {
        if (process.env.NODE_ENV === 'test') {
          return;
        }
        if (!action.action_url || !ValidationHelper.isValidUrl(action.action_url)) {
          throw new BadRequestException(Messages.URL_INVALID);
        }
      }
    }
  }
}
