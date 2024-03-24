import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { FoundUserDs } from '../../user/application/data-structures/found-user.ds.js';
import { IFindUsersInConnection } from './use-cases.interfaces.js';

@Injectable()
export class FindAllUsersInConnectionUseCase
  extends AbstractUseCase<string, Array<FoundUserDs>>
  implements IFindUsersInConnection
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(connectionId: string): Promise<Array<FoundUserDs>> {
    const userInConnection = await this._dbContext.userRepository.findAllUsersInConnection(connectionId);
    return userInConnection.map((user) => {
      return {
        id: user.id,
        isActive: user.isActive,
        email: user.email,
        createdAt: user.createdAt,
        name: user.name,
        suspended: user.suspended,
        is_2fa_enabled: user.otpSecretKey !== null && user.isOTPEnabled,
      };
    });
  }
}
