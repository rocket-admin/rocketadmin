import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { FoundUserDto } from '../../user/dto/found-user.dto.js';
import { IFindUsersInConnection } from './use-cases.interfaces.js';
import { buildFoundUserDto } from '../../user/utils/build-found-user.dto.js';
import { UserEntity } from '../../user/user.entity.js';

@Injectable()
export class FindAllUsersInConnectionUseCase
  extends AbstractUseCase<string, Array<FoundUserDto>>
  implements IFindUsersInConnection
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(connectionId: string): Promise<Array<FoundUserDto>> {
    const userInConnection = await this._dbContext.userRepository.findAllUsersInConnection(connectionId);
    return userInConnection.map((user) => {
      //todo fix type after repository types are fixed
      return buildFoundUserDto(user as UserEntity);
    });
  }
}
