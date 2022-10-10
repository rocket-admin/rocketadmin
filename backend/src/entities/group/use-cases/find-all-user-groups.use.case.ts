import { Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { FoundUserGroupsDs } from '../application/data-sctructures/found-user-groups.ds';
import { IFindUserGroups } from './use-cases.interfaces';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { GroupEntity } from '../group.entity';
import { AccessLevelEnum } from '../../../enums';

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
