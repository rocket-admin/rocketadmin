import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { GroupEntity } from '../../group/group.entity.js';
import { CreateGroupInConnectionDs } from '../application/data-structures/create-group-in-connection.ds.js';
import { buildNewGroupEntityForConnectionWithUser } from '../utils/build-new-group-entity-for-connection-with-user.js';
import { ICreateGroupInConnection } from './use-cases.interfaces.js';

@Injectable()
export class CreateGroupInConnectionUseCase
  extends AbstractUseCase<CreateGroupInConnectionDs, Omit<GroupEntity, 'connection' | 'users' | 'permissions'>>
  implements ICreateGroupInConnection
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: CreateGroupInConnectionDs): Promise<Omit<GroupEntity, 'connection'>> {
    const {
      group_parameters: { connectionId, title },
      creation_info: { cognitoUserName },
    } = inputData;
    const connectionToUpdate = await this._dbContext.connectionRepository.findConnectionWithGroups(connectionId);
    if (connectionToUpdate.groups.find((group) => group.title === title)) {
      throw new HttpException(
        {
          message: Messages.GROUP_NAME_UNIQUE,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const foundUser = await this._dbContext.userRepository.findOneUserById(cognitoUserName);
    const newGroupEntity = buildNewGroupEntityForConnectionWithUser(connectionToUpdate, foundUser, title);
    const savedGroup = await this._dbContext.groupRepository.saveNewOrUpdatedGroup(newGroupEntity);
    delete savedGroup.connection;
    return savedGroup;
  }
}
