import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { FoundGroupDataInfoDs } from '../application/data-sctructures/found-user-groups.ds.js';
import { UpdateGroupTitleDto } from '../dto/update-group-title.dto.js';
import { IUpdateGroupTitle } from './use-cases.interfaces.js';
import { Messages } from '../../../exceptions/text/messages.js';

@Injectable({ scope: Scope.REQUEST })
export class UpdateGroupTitleUseCase
  extends AbstractUseCase<UpdateGroupTitleDto, FoundGroupDataInfoDs>
  implements IUpdateGroupTitle
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(groupData: UpdateGroupTitleDto): Promise<FoundGroupDataInfoDs> {
    const { groupId, title } = groupData;
    const groupToUpdate = await this._dbContext.groupRepository.findGroupByIdWithConnectionAndUsers(groupId);
    if (!groupToUpdate) {
      throw new HttpException(
        {
          message: Messages.GROUP_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    groupToUpdate.title = title;
    const updatedGroup = await this._dbContext.groupRepository.saveNewOrUpdatedGroup(groupToUpdate);
    return {
      id: updatedGroup.id,
      title: updatedGroup.title,
      isMain: updatedGroup.isMain,
    };
  }
}
