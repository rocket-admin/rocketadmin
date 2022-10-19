import { Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IFindAllUsersInGroup } from './use-cases.interfaces';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { UserEntity } from 'src/entities/user/user.entity';
import { FoundUserInGroupDs } from '../../user/application/data-structures/found-user-in-group.ds';
import { buildFoundUserInGroupDs } from '../../user/utils/build-found-user.ds';

@Injectable()
export class FindAllUsersInGroupUseCase
  extends AbstractUseCase<string, Array<FoundUserInGroupDs>>
  implements IFindAllUsersInGroup
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(groupId: string): Promise<Array<FoundUserInGroupDs>> {
    const result: Array<UserEntity> = await this._dbContext.groupRepository.findAllUsersInGroup(groupId);
    return result.map((user: UserEntity) => {
      return buildFoundUserInGroupDs(user);
    });
  }
}
