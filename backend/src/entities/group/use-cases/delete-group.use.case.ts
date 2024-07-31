import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { DeletedGroupResultDs } from '../application/data-sctructures/deleted-group-result.ds.js';
import { IDeleteGroup } from './use-cases.interfaces.js';

@Injectable({ scope: Scope.REQUEST })
export class DeleteGroupUseCase extends AbstractUseCase<string, DeletedGroupResultDs> implements IDeleteGroup {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(groupId: string): Promise<DeletedGroupResultDs> {
    const groupToDelete = await this._dbContext.groupRepository.findGroupById(groupId);
    if (groupToDelete.isMain) {
      throw new HttpException(
        {
          message: Messages.CANT_DELETE_ADMIN_GROUP,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const deletedGroup = await this._dbContext.groupRepository.removeGroupEntity(groupToDelete);
    return {
      id: deletedGroup.id,
      title: deletedGroup.title,
      isMain: deletedGroup.isMain,
    };
  }
}
