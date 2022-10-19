import AbstractUseCase from '../../../common/abstract-use.case';
import { BaseType } from '../../../common/data-injection.tokens';
import { DeleteGroupInConnectionDs } from '../application/data-structures/delete-group-in-connection.ds';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { IDeleteGroupInConnection } from './use-cases.interfaces';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { Messages } from '../../../exceptions/text/messages';
import { GroupEntity } from '../../group/group.entity';

@Injectable()
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
      throw new HttpException(
        {
          message: Messages.GROUP_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (groupToDelete.isMain) {
      throw new HttpException(
        {
          message: Messages.CANT_DELETE_ADMIN_GROUP,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const removedGroup = await this._dbContext.groupRepository.removeGroupEntity(groupToDelete);
    delete removedGroup.connection;
    return removedGroup;
  }
}
