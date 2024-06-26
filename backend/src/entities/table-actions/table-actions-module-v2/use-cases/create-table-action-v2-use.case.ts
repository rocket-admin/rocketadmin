import { BadRequestException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { ICreateTableActionV2 } from './table-actions-v2-use-cases.interface.js';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { CreateTableActionWithEventAndRuleDS } from '../../application/data-structures/create-table-action-with-event-and-rule.ds.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { buildEmptyTableSettingsWithEmptyWidgets } from '../../../table-settings/utils/build-empty-table-settings.js';
import { buildNewTableSettingsEntity } from '../../../table-settings/utils/build-new-table-settings-entity.js';
import { TableActionMethodEnum } from '../../../../enums/table-action-method-enum.js';
import { buildTableActionEntityV2 } from '../utils/build-table-action-entity-v2.util.js';
import { ValidationHelper } from '../../../../helpers/validators/validation-helper.js';
import { buildTableActionRule } from '../utils/build-table-action-rule.util.js';
import { buildTableActionEventEntity } from '../utils/build-table-event-entity.util.js';
import { FoundTableActionWithEventsAndRulesDto } from '../../application/dto/found-table-action-with-events-and-rules.dto.js';
import { buildFoundTableActionEventsAndRulesDto } from '../utils/build-found-table-action-with-events-and-rules-dto.util.js';
import { ActionRulesEntity } from '../../table-action-rules-module/action-rules.entity.js';

@Injectable({ scope: Scope.REQUEST })
export class CreateTableActionV2UseCase
  extends AbstractUseCase<CreateTableActionWithEventAndRuleDS, FoundTableActionWithEventsAndRulesDto>
  implements ICreateTableActionV2
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(
    createActionData: CreateTableActionWithEventAndRuleDS,
  ): Promise<FoundTableActionWithEventsAndRulesDto> {
    const { connection_data, table_action_data, action_rules_data } = createActionData;
    const { connectionId, masterPwd, userId } = connection_data;
    const { action_emails, action_method, action_slack_url, action_url } = table_action_data;
    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connectionId,
      masterPwd,
    );
    if (!foundConnection) {
      throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
    }

    if (action_method === TableActionMethodEnum.EMAIL) {
      const companyWithUsers = await this._dbContext.companyInfoRepository.findUserCompanyWithUsers(userId);
      const usersInCompanyEmails = companyWithUsers.users.map((user) => user.email);
      const emailsNotInCompany = action_emails.filter((email) => !usersInCompanyEmails.includes(email));
      if (emailsNotInCompany.length > 0) {
        throw new BadRequestException(Messages.EMAILS_NOT_IN_COMPANY(emailsNotInCompany));
      }
      const emailsNotVerified = action_emails.filter((email) => {
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
    if (action_method === TableActionMethodEnum.SLACK) {
      if (!action_slack_url) {
        throw new BadRequestException(Messages.SLACK_CREDENTIALS_MISSING);
      }
    }

    if (action_method === TableActionMethodEnum.URL) {
      if (!action_url || !ValidationHelper.isValidUrl(action_url)) {
        throw new BadRequestException(Messages.URL_INVALID);
      }
    }

    const newTableAction = buildTableActionEntityV2(table_action_data);
    const savedTableAction = await this._dbContext.tableActionRepository.saveNewOrUpdatedTableAction(newTableAction);

    const savedRules: Array<ActionRulesEntity> = [];
    for (const rule of action_rules_data) {
      const { events_data } = rule;
      const newRule = buildTableActionRule(rule);
      newRule.table_actions = [savedTableAction];
      newRule.action_events = [];
      const savedRule = await this._dbContext.actionRulesRepository.saveNewOrUpdatedActionRules(newRule);
      for (const event of events_data) {
        const newEvent = buildTableActionEventEntity(event);
        newEvent.action_rules = [savedRule];
        const savedEvent = await this._dbContext.actionEventsRepository.saveNewOrUpdatedActionEvents(newEvent);
        savedRule.action_events.push(savedEvent);
        savedRules.push(savedRule);
      }
    }
    savedTableAction.action_rules = savedRules;

    for (const rule of savedRules) {
      const { table_name } = rule;
      let tableSettingToUpdate = await this._dbContext.tableSettingsRepository.findTableSettingsWithTableActions(
        connectionId,
        table_name,
      );
      if (!tableSettingToUpdate) {
        const emptyTableSettingsDs = buildEmptyTableSettingsWithEmptyWidgets(connectionId, table_name, userId);
        const newTableSettings = buildNewTableSettingsEntity(emptyTableSettingsDs, foundConnection);
        tableSettingToUpdate = await this._dbContext.tableSettingsRepository.saveNewOrUpdatedSettings(newTableSettings);
      }
      if (!tableSettingToUpdate.table_actions) {
        tableSettingToUpdate.table_actions = [];
      }
      tableSettingToUpdate.table_actions.push(savedTableAction);
      const savedTableSettings =
        await this._dbContext.tableSettingsRepository.saveNewOrUpdatedSettings(tableSettingToUpdate);
      savedTableAction.settings = savedTableSettings;
    }
    return buildFoundTableActionEventsAndRulesDto(savedTableAction);
  }
}
