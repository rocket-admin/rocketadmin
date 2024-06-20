import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Encryptor } from '../../../../helpers/encryption/encryptor.js';
import { buildEmptyTableSettingsWithEmptyWidgets } from '../../../table-settings/utils/build-empty-table-settings.js';
import { buildNewTableSettingsEntity } from '../../../table-settings/utils/build-new-table-settings-entity.js';
import { CreateTableActionDS } from '../application/data-sctructures/create-table-action.ds.js';
import { CreatedTableActionDS } from '../application/data-sctructures/created-table-action.ds.js';
import { buildCreatedTableActionDS } from '../utils/build-created-table-action-ds.js';
import { buildNewTableActionEntity } from '../utils/build-new-table-action-entity.util.js';
import { ICreateTableAction } from './table-actions-use-cases.interface.js';
import { TableActionMethodEnum } from '../../../../enums/table-action-method-enum.js';
import { Messages } from '../../../../exceptions/text/messages.js';

@Injectable()
export class CreateTableActionUseCase
  extends AbstractUseCase<CreateTableActionDS, CreatedTableActionDS>
  implements ICreateTableAction
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: CreateTableActionDS): Promise<CreatedTableActionDS> {
    const { connectionId, tableName, userId, method, emails } = inputData;
    const foundConnection = await this._dbContext.connectionRepository.findOne({ where: { id: connectionId } });
    if (!foundConnection.signing_key) {
      foundConnection.signing_key = Encryptor.generateRandomString(40);
      await this._dbContext.connectionRepository.saveUpdatedConnection(foundConnection);
    }

    if (method === TableActionMethodEnum.EMAIL) {
      const companyWithUsers = await this._dbContext.companyInfoRepository.findUserCompanyWithUsers(userId);
      const usersInCompanyEmails = companyWithUsers.users.map((user) => user.email);
      const emailsNotInCompany = emails.filter((email) => !usersInCompanyEmails.includes(email));
      if (emailsNotInCompany.length > 0) {
        throw new BadRequestException(Messages.EMAILS_NOT_IN_COMPANY(emailsNotInCompany));
      }
      const emailsNotVerified = emails.filter((email) => {
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

    let tableSettingToUpdate = await this._dbContext.tableSettingsRepository.findTableSettingsWithTableActions(
      connectionId,
      tableName,
    );

    if (!tableSettingToUpdate) {
      const emptyTableSettingsDs = buildEmptyTableSettingsWithEmptyWidgets(connectionId, tableName, userId);
      const newTableSettings = buildNewTableSettingsEntity(emptyTableSettingsDs, foundConnection);
      tableSettingToUpdate = await this._dbContext.tableSettingsRepository.saveNewOrUpdatedSettings(newTableSettings);
    }
    const newTableAction = buildNewTableActionEntity(inputData);
    const savedTableAction = await this._dbContext.tableActionRepository.saveNewOrUpdatedTableAction(newTableAction);
    tableSettingToUpdate.table_actions.push(savedTableAction);
    await this._dbContext.tableSettingsRepository.saveNewOrUpdatedSettings(tableSettingToUpdate);
    const foundTableAction = await this._dbContext.tableActionRepository.findTableActionById(savedTableAction.id);
    return buildCreatedTableActionDS(foundTableAction);
  }
}
