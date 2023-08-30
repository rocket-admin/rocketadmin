import { HttpException, HttpStatus, Inject } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { AddRemoveCompanyIdToUserDS } from '../data-structures/add-company-id-to-user.ds.js';
import { IAddOrRemoveCompanyIdToUser } from './saas-use-cases.interface.js';
import { Messages } from '../../../exceptions/text/messages.js';

export class RemoveCompanyIdFromUserUseCase
  extends AbstractUseCase<AddRemoveCompanyIdToUserDS, void>
  implements IAddOrRemoveCompanyIdToUser
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: AddRemoveCompanyIdToUserDS): Promise<void> {
    const { userId, companyId } = inputData;
    const foundUser = await this._dbContext.userRepository.findOneUserByIdWithCompany(userId);
    if (!foundUser || !foundUser.company) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (foundUser.company.id !== companyId) {
      throw new HttpException(
        {
          message: Messages.FAILED_REMOVE_USER_FROM_COMPANY,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    foundUser.company = null;
    await this._dbContext.userRepository.saveUserEntity(foundUser);
  }
}
