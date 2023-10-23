import { Inject } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { UserEntity } from '../../../entities/user/user.entity.js';
import { ISaasGetUsersInfosByEmail } from './saas-use-cases.interface.js';

export class GetUsersInfosByEmailUseCase
  extends AbstractUseCase<string, Array<UserEntity>>
  implements ISaasGetUsersInfosByEmail
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(userEmail: string): Promise<Array<UserEntity>> {
    const foundUsers: Array<UserEntity> = await this._dbContext.userRepository.findAllUsersWithEmail(userEmail);
    return foundUsers.map((user) => {
      delete user.password;
      return user;
    });
  }
}
