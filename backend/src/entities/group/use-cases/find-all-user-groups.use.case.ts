import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { AccessLevelEnum } from '../../../enums/index.js';
import { FoundUserGroupsDs } from '../application/data-sctructures/found-user-groups.ds.js';
import { GroupEntity } from '../group.entity.js';
import { IFindUserGroups } from './use-cases.interfaces.js';

@Injectable()
export class FindAllUserGroupsUseCase extends AbstractUseCase<string, FoundUserGroupsDs> implements IFindUserGroups {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(userId: string): Promise<FoundUserGroupsDs> {
    const foundUserGroups: Array<GroupEntity> = await this._dbContext.groupRepository.findAllUserGroups(userId);
    const groupsWithAccessLevels: Array<{
      group: GroupEntity;
      accessLevel: AccessLevelEnum;
    }> = await Promise.all(
      foundUserGroups.map(async (group: GroupEntity) => {
        const accessLevel = await this._dbContext.userAccessRepository.getGroupAccessLevel(userId, group.id);
        return {
          group: group,
          accessLevel: accessLevel,
        };
      }),
    );

    return {
      groups: groupsWithAccessLevels.map((g) => {
        const {
          accessLevel,
          group: { id, isMain, title },
        } = g;
        return {
          group: {
            id: id,
            title: title,
            isMain: isMain,
          },
          accessLevel: accessLevel,
        };
      }),
      groupsCount: groupsWithAccessLevels.length,
    };
  }
}
