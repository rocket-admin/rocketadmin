import { Inject, Injectable } from '@nestjs/common';
import { UserEntity } from 'src/entities/user/user.entity';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { FoundUserInGroupDs } from '../../user/application/data-structures/found-user-in-group.ds.js';
import { UserHelperService } from '../../user/user-helper.service.js';
import { IFindAllUsersInGroup } from './use-cases.interfaces.js';

@Injectable()
export class FindAllUsersInGroupUseCase
  extends AbstractUseCase<string, Array<FoundUserInGroupDs>>
  implements IFindAllUsersInGroup
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly userHelperService: UserHelperService,
  ) {
    super();
  }

  protected async implementation(groupId: string): Promise<Array<FoundUserInGroupDs>> {
    const result: Array<UserEntity> = await this._dbContext.groupRepository.findAllUsersInGroup(groupId);
    return result.map((user: UserEntity) => {
      return this.userHelperService.buildFoundUserInGroupDs(user);
    });
  }
}
