import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { UserEntity } from '../../../entities/user/user.entity.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { GetUserInfoByIdDS } from '../data-structures/get-user-info.ds.js';
import { IGetUserInfo } from './saas-use-cases.interface.js';

@Injectable()
export class GetUserInfoUseCase extends AbstractUseCase<GetUserInfoByIdDS, UserEntity> implements IGetUserInfo {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: GetUserInfoByIdDS): Promise<UserEntity> {
    const { userId, companyId } = inputData;
    let foundUser: UserEntity;
    if (companyId) {
      foundUser = await this._dbContext.userRepository.findOneUserByIdAndCompanyId(userId, companyId);
    } else {
      foundUser = await this._dbContext.userRepository.findOneUserById(userId);
    }
    delete foundUser.password;
    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return foundUser;
  }
}
