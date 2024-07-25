import { BadRequestException, ForbiddenException, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { DeleteGroupInConnectionDs } from '../application/data-structures/delete-group-in-connection.ds.js';
import { IDeleteGroupInConnection } from './use-cases.interfaces.js';
import { buildFoundGroupResponseDto } from '../../group/utils/biuld-found-group-response.dto.js';
import { FoundGroupResponseDto } from '../../group/dto/found-group-response.dto.js';

@Injectable({ scope: Scope.REQUEST })
export class DeleteGroupFromConnectionUseCase
  extends AbstractUseCase<DeleteGroupInConnectionDs, FoundGroupResponseDto>
  implements IDeleteGroupInConnection
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: DeleteGroupInConnectionDs): Promise<FoundGroupResponseDto> {
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
    return buildFoundGroupResponseDto(removedGroup);
  }
}
