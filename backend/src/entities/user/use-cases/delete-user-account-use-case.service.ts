import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { RegisteredUserDs } from '../application/data-structures/registered-user.ds';
import { IDeleteUserAccount } from './user-use-cases.interfaces';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { Messages } from '../../../exceptions/text/messages';

@Injectable({ scope: Scope.REQUEST })
export class DeleteUserAccountUseCase
  extends AbstractUseCase<string, Omit<RegisteredUserDs, 'token'>>
  implements IDeleteUserAccount
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(userId: string): Promise<Omit<RegisteredUserDs, 'token'>> {
    const foundUser = await this._dbContext.userRepository.findOneUserById(userId);
    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    await this._dbContext.userRepository.deleteUserEntity(foundUser);
    return {
      id: foundUser.id,
      email: foundUser.email,
    };
  }
}
