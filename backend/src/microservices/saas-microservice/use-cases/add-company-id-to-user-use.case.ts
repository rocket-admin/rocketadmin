import { HttpException, HttpStatus, Inject } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { AddRemoveCompanyIdToUserDS } from '../data-structures/add-company-id-to-user.ds.js';
import { IAddOrRemoveCompanyIdToUser } from './saas-use-cases.interface.js';

export class AddCompanyIdToUserUseCase
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
    const foundUser = await this._dbContext.userRepository.findOneUserById(userId);
    const foundCompany = await this._dbContext.companyInfoRepository.findOneBy({ id: companyId });
    if (!foundUser || !foundCompany) {
      throw new HttpException(
        {
          message: 'Required entity not found',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    foundUser.company = foundCompany;
    await this._dbContext.userRepository.saveUserEntity(foundUser);
  }
}
