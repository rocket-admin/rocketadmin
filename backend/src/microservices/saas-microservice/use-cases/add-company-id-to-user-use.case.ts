import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { AddRemoveCompanyIdToUserDS } from '../data-structures/add-company-id-to-user.ds.js';
import { IAddOrRemoveCompanyIdToUser } from './saas-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
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
    const { userId, companyId, userRole } = inputData;
    const foundUser = await this._dbContext.userRepository.findOneUserById(userId);
    const foundCompanyWithUsers = await this._dbContext.companyInfoRepository.findOne({
      where: { id: companyId },
      relations: ['users'],
    });

    if (!foundUser) {
      throw new HttpException(
        {
          message: 'Required user not found',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!foundCompanyWithUsers) {
      throw new HttpException(
        {
          message: 'Required company not found',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const userAlreadyInCompany = !!foundCompanyWithUsers.users.find((user) => user.id === foundUser.id);
    if (!userAlreadyInCompany) {
      if (userRole) {
        foundUser.role = userRole;
        await this._dbContext.userRepository.saveUserEntity(foundUser);
      }
      foundCompanyWithUsers.users.push(foundUser);
      await this._dbContext.companyInfoRepository.save(foundCompanyWithUsers);
    }
  }
}
