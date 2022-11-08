import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { FoundUserDs } from '../../user/application/data-structures/found-user.ds';
import { IFindUsersInConnection } from './use-cases.interfaces';

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
    return await Promise.all(
      userInConnection.map(async (user) => {
        return {
          id: user.id,
          isActive: user.isActive,
          email: user.email,
          createdAt: user.createdAt,
          name: user.name,
        };
      }),
    );
  }
}
