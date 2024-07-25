import { Inject, Injectable, InternalServerErrorException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isConnectionTypeAgent, slackPostMessage } from '../../../helpers/index.js';
import { UserEntity } from '../../user/user.entity.js';
import { CreateConnectionDs } from '../application/data-structures/create-connection.ds.js';
import { CreatedConnectionDTO } from '../application/dto/created-connection.dto.js';
import { ConnectionEntity } from '../connection.entity.js';
import { buildConnectionEntity } from '../utils/build-connection-entity.js';
import { buildCreatedConnectionDs } from '../utils/build-created-connection.ds.js';
import { validateCreateConnectionData } from '../utils/validate-create-connection-data.js';
import { ICreateConnection } from './use-cases.interfaces.js';
import { processAWSConnection } from '../utils/process-aws-connection.util.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';

@Injectable({ scope: Scope.REQUEST })
export class CreateConnectionUseCase
  extends AbstractUseCase<CreateConnectionDs, CreatedConnectionDTO>
  implements ICreateConnection
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }
  protected async implementation(createConnectionData: CreateConnectionDs): Promise<CreatedConnectionDTO> {
    const {
      creation_info: { authorId, masterPwd },
    } = createConnectionData;
    const connectionAuthor: UserEntity = await this._dbContext.userRepository.findOneUserById(authorId);

    if (!connectionAuthor) {
      throw new InternalServerErrorException(Messages.USER_NOT_FOUND);
    }

    await slackPostMessage(Messages.USER_TRY_CREATE_CONNECTION(connectionAuthor.email));
    await validateCreateConnectionData(createConnectionData);
    createConnectionData = await processAWSConnection(createConnectionData);
    const createdConnection: ConnectionEntity = buildConnectionEntity(createConnectionData, connectionAuthor);

    if (!isConnectionTypeAgent(createdConnection.type)) {
      const dao = getDataAccessObject(createdConnection);
      try {
        await dao.testConnect();
      } catch (e) {
        const text: string = e.message.toLowerCase();
        if (text.includes('ssl required') || text.includes('ssl connection required')) {
          createdConnection.ssl = true;
          try {
            const updatedDao = getDataAccessObject(createdConnection);
            await updatedDao.testConnect();
          } catch (e) {
            createdConnection.ssl = false;
          }
        }
      }
    }
    const savedConnection: ConnectionEntity =
      await this._dbContext.connectionRepository.saveNewConnection(createdConnection);
    let token: string;
    if (isConnectionTypeAgent(savedConnection.type)) {
      token = await this._dbContext.agentRepository.createNewAgentForConnectionAndReturnToken(savedConnection);
    }
    const createdAdminGroup = await this._dbContext.groupRepository.createdAdminGroupInConnection(
      savedConnection,
      connectionAuthor,
    );
    await this._dbContext.permissionRepository.createdDefaultAdminPermissionsInGroup(createdAdminGroup);
    delete createdAdminGroup.connection;
    await this._dbContext.userRepository.saveUserEntity(connectionAuthor);
    createdConnection.groups = [createdAdminGroup];
    const foundUserCompany = await this._dbContext.companyInfoRepository.findOneCompanyInfoByUserIdWithConnections(
      connectionAuthor.id,
    );
    if (foundUserCompany) {
      const connection = await this._dbContext.connectionRepository.findOne({ where: { id: savedConnection.id } });
      connection.company = foundUserCompany;
      await this._dbContext.connectionRepository.saveUpdatedConnection(connection);
    }
    await slackPostMessage(Messages.USER_CREATED_CONNECTION(connectionAuthor.email));
    return buildCreatedConnectionDs(savedConnection, token, masterPwd);
  }
}
