import { BadRequestException, Inject, Injectable, Scope } from '@nestjs/common';
import { IUpdateActionRule } from './action-rules-use-cases.interface.js';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { UpdateActionRuleDS } from '../application/data-structures/update-action-rule.ds.js';
import { FoundActionRulesWithActionsAndEventsDTO } from '../application/dto/found-action-rules-with-actions-and-events.dto.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { TableActionMethodEnum } from '../../../../enums/table-action-method-enum.js';
import { ValidationHelper } from '../../../../helpers/validators/validation-helper.js';
import { CreateTableActionData } from '../application/data-structures/create-action-rules.ds.js';
import { buildTableActionWithRule } from '../../table-actions-module/utils/build-table-action-with-rule.util.js';
import { buildActionEventWithRule } from '../../table-action-events-module/utils/build-action-event-with-rule.util.js';
import { buildFoundActionRulesWithActionsAndEventsDTO } from '../utils/build-found-action-rules-with-actions-and-events-dto.util.js';

@Injectable({ scope: Scope.REQUEST })
export class UpdateRuleUseCase
  extends AbstractUseCase<UpdateActionRuleDS, FoundActionRulesWithActionsAndEventsDTO>
  implements IUpdateActionRule
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  public async implementation(inputData: UpdateActionRuleDS): Promise<FoundActionRulesWithActionsAndEventsDTO> {
    const { connection_data, action_events_data, rule_data, table_actions_data } = inputData;
    const { connectionId, masterPwd, userId } = connection_data;
    const { table_name, rule_id, rule_title } = rule_data;

    const foundRuleToUpdate = await this._dbContext.actionRulesRepository.findOneWithActionsAndEvents(
      rule_id,
      connectionId,
    );
    if (!foundRuleToUpdate) {
      throw new BadRequestException(Messages.RULE_NOT_FOUND);
    }

    await this.validateActionEmailsOrThrowException(table_actions_data, userId);
    await this.validateTableNameOrThrowException(table_name, connectionId, masterPwd);
    await this.validateTableActionDataOrThrowException(table_actions_data);

    foundRuleToUpdate.title = rule_title;
    foundRuleToUpdate.table_name = table_name;

    await this._dbContext.actionRulesRepository.saveNewOrUpdatedActionRule(foundRuleToUpdate);

    const { action_events, table_actions } = foundRuleToUpdate;

    const tableActionsToCreate = table_actions_data.filter((tableAction) => !tableAction.action_id);
    const tableActionsToUpdate = table_actions_data.filter((tableAction) => tableAction.action_id);
    const tableActionsToDelete = table_actions.filter(
      (tableAction) => !table_actions_data.map((tableAction) => tableAction.action_id).includes(tableAction.id),
    );

    const actionEventsToCreate = action_events_data.filter((actionEvent) => !actionEvent.event_id);
    const actionEventsToUpdate = action_events_data.filter((actionEvent) => actionEvent.event_id);
    const actionEventsToDelete = action_events.filter(
      (actionEvent) => !action_events_data.map((actionEvent) => actionEvent.event_id).includes(actionEvent.id),
    );

    const createdTableActions = await Promise.all(
      tableActionsToCreate.map((tableAction) => {
        const newTableAction = buildTableActionWithRule(tableAction, foundRuleToUpdate);
        return this._dbContext.tableActionRepository.saveNewOrUpdatedTableAction(newTableAction);
      }),
    );

    const updatedTableActions = await Promise.all(
      tableActionsToUpdate.map((tableAction) => {
        const foundTableAction = table_actions.find((action) => action.id === tableAction.action_id);
        foundTableAction.method = tableAction.action_method;
        foundTableAction.url = tableAction.action_url;
        foundTableAction.slack_url = tableAction.action_slack_url;
        foundTableAction.emails = tableAction.action_emails;
        return this._dbContext.tableActionRepository.saveNewOrUpdatedTableAction(foundTableAction);
      }),
    );

    await Promise.all(
      tableActionsToDelete.map((tableAction) => {
        return this._dbContext.tableActionRepository.remove(tableAction);
      }),
    );

    const tableActionToResponse = [...createdTableActions, ...updatedTableActions];

    const createdActionEvents = await Promise.all(
      actionEventsToCreate.map((actionEvent) => {
        const newActionEvent = buildActionEventWithRule(actionEvent, foundRuleToUpdate);
        return this._dbContext.actionEventsRepository.saveNewOrUpdatedActionEvent(newActionEvent);
      }),
    );

    const updatedActionEvents = await Promise.all(
      actionEventsToUpdate.map((actionEvent) => {
        const foundActionEvent = action_events.find((event) => event.id === actionEvent.event_id);
        foundActionEvent.event = actionEvent.event;
        foundActionEvent.title = actionEvent.event_title;
        foundActionEvent.icon = actionEvent.icon;
        foundActionEvent.require_confirmation = actionEvent.require_confirmation;
        return this._dbContext.actionEventsRepository.saveNewOrUpdatedActionEvent(foundActionEvent);
      }),
    );

    await Promise.all(
      actionEventsToDelete.map((actionEvent) => {
        return this._dbContext.actionEventsRepository.remove(actionEvent);
      }),
    );

    const actionEventsToResponse = [...createdActionEvents, ...updatedActionEvents];

    const foundRuleToUpdateCopy = { ...foundRuleToUpdate };
    foundRuleToUpdateCopy.table_actions = tableActionToResponse;
    foundRuleToUpdateCopy.action_events = actionEventsToResponse;
    return buildFoundActionRulesWithActionsAndEventsDTO(foundRuleToUpdateCopy);
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
      if (action.action_method === TableActionMethodEnum.URL) {
        if (!action.action_url || !ValidationHelper.isValidUrl(action.action_url)) {
          throw new BadRequestException(Messages.URL_INVALID);
        }
      }
    }
  }
}
