import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { UserEntity } from '../../../entities/user/user.entity.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGetUserInfoByEmail } from './saas-use-cases.interface.js';
import { GetUserInfoByEmailDS } from '../data-structures/get-user-info.ds.js';

@Injectable()
export class GetUserInfoByEmailUseCase
  extends AbstractUseCase<GetUserInfoByEmailDS, UserEntity>
  implements IGetUserInfoByEmail
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: GetUserInfoByEmailDS): Promise<UserEntity> {
    let foundUser: UserEntity = null;
    const { email, companyId } = inputData;
    if (companyId) {
      foundUser = await this._dbContext.userRepository.findOneUserByEmailAndCompanyId(email, companyId);
    } else {
      foundUser = await this._dbContext.userRepository.findOneUserByEmail(email);
    }

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
