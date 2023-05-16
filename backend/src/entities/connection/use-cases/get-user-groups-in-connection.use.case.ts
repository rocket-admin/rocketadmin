import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { GroupEntity } from '../../group/group.entity.js';
import { FoundUserGroupsInConnectionDs } from '../application/data-structures/found-user-groups-in-connection.ds.js';
import { GetGroupsInConnectionDs } from '../application/data-structures/get-groups-in-connection.ds.js';
import { IGetUserGroupsInConnection } from './use-cases.interfaces.js';

@Injectable()
export class GetUserGroupsInConnectionUseCase
  extends AbstractUseCase<GetGroupsInConnectionDs, Array<FoundUserGroupsInConnectionDs>>
  implements IGetUserGroupsInConnection
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: GetGroupsInConnectionDs): Promise<Array<FoundUserGroupsInConnectionDs>> {
    const userGroups = await this._dbContext.groupRepository.findAllUserGroupsInConnection(
      inputData.connectionId,
      inputData.cognitoUserName,
    );
    return await Promise.all(
      userGroups.map(async (group: Omit<GroupEntity, 'connection' | 'users'>) => {
        const userAccessLevel = await this._dbContext.userAccessRepository.getGroupAccessLevel(
          inputData.cognitoUserName,
          group.id,
        );
        return {
          group: group,
          accessLevel: userAccessLevel,
        };
      }),
    );
  }
}
