import { BadRequestException, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { CreatedTableActionDS } from '../application/data-sctructures/created-table-action.ds.js';
import { UpdateTableActionDS } from '../application/data-sctructures/update-table-action.ds.js';
import { buildCreatedTableActionDS } from '../utils/build-created-table-action-ds.js';
import { buildNewTableActionEntity } from '../utils/build-new-table-action-entity.util.js';
import { IUpdateTableAction } from './table-actions-use-cases.interface.js';
import { TableActionMethodEnum } from '../../../enums/table-action-method-enum.js';

@Injectable()
export class UpdateTableActionUseCase
  extends AbstractUseCase<UpdateTableActionDS, CreatedTableActionDS>
  implements IUpdateTableAction
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: UpdateTableActionDS): Promise<CreatedTableActionDS> {
    const { actionId, emails, userId } = inputData;
    const foundTableActionEntity = await this._dbContext.tableActionRepository.findTableActionById(actionId);
    if (!foundTableActionEntity) {
      throw new HttpException({ message: Messages.TABLE_ACTION_NOT_FOUND }, HttpStatus.BAD_REQUEST);
    }

    const updatingTableAction = buildNewTableActionEntity(inputData);
    for (const key in updatingTableAction) {
      // eslint-disable-next-line security/detect-object-injection
      if (updatingTableAction[key] === undefined) {
        // eslint-disable-next-line security/detect-object-injection
        delete updatingTableAction[key];
      }
    }
    const updated = Object.assign(foundTableActionEntity, updatingTableAction);

    if (updated.method === TableActionMethodEnum.EMAIL) {
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

    const savedAction = await this._dbContext.tableActionRepository.saveNewOrUpdatedTableAction(updated);
    const foundUpdatedAction = await this._dbContext.tableActionRepository.findTableActionById(savedAction.id);
    return buildCreatedTableActionDS(foundUpdatedAction);
  }
}
