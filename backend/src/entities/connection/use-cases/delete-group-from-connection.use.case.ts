import { BadRequestException, ForbiddenException, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { GroupEntity } from '../../group/group.entity.js';
import { DeleteGroupInConnectionDs } from '../application/data-structures/delete-group-in-connection.ds.js';
import { IDeleteGroupInConnection } from './use-cases.interfaces.js';

@Injectable({ scope: Scope.REQUEST })
export class DeleteGroupFromConnectionUseCase
  extends AbstractUseCase<DeleteGroupInConnectionDs, Omit<GroupEntity, 'connection'>>
  implements IDeleteGroupInConnection
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: DeleteGroupInConnectionDs): Promise<Omit<GroupEntity, 'connection'>> {
    const groupToDelete = await this._dbContext.groupRepository.findGroupInConnection(
      inputData.groupId,
      inputData.connectionId,
    );
    if (!groupToDelete) {
      throw new BadRequestException(Messages.GROUP_NOT_FOUND);
    }
    if (groupToDelete.isMain) {
      throw new ForbiddenException(Messages.CANT_DELETE_ADMIN_GROUP);
    }
    const removedGroup = await this._dbContext.groupRepository.removeGroupEntity(groupToDelete);
    delete removedGroup.connection;
    return removedGroup;
  }
}
