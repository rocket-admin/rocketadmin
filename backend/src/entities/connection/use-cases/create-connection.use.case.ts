import { BadRequestException, Inject, Injectable, InternalServerErrorException, Scope } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/src/data-access-layer/shared/create-data-access-object.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isConnectionTypeAgent, slackPostMessage } from '../../../helpers/index.js';
import { UserRoleEnum } from '../../user/enums/user-role.enum.js';
import { UserEntity } from '../../user/user.entity.js';
import { CreateConnectionDs } from '../application/data-structures/create-connection.ds.js';
import { CreatedConnectionDTO } from '../application/dto/created-connection.dto.js';
import { ConnectionEntity } from '../connection.entity.js';
import { buildConnectionEntity } from '../utils/build-connection-entity.js';
import { buildCreatedConnectionDs } from '../utils/build-created-connection.ds.js';
import { processAWSConnection } from '../utils/process-aws-connection.util.js';
import { validateCreateConnectionData } from '../utils/validate-create-connection-data.js';
import { ICreateConnection } from './use-cases.interfaces.js';
import { SharedJobsService } from '../../shared-jobs/shared-jobs.service.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';

@Injectable({ scope: Scope.REQUEST })
export class CreateConnectionUseCase
  extends AbstractUseCase<CreateConnectionDs, CreatedConnectionDTO>
  implements ICreateConnection
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly sharedJobsService: SharedJobsService,
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

    if (connectionAuthor.role !== UserRoleEnum.ADMIN && connectionAuthor.role !== UserRoleEnum.DB_ADMIN) {
      throw new BadRequestException(Messages.CANT_CREATE_CONNECTION_USER_NON_COMPANY_ADMIN);
    }

    await slackPostMessage(
      Messages.USER_TRY_CREATE_CONNECTION(connectionAuthor.email, createConnectionData.connection_parameters.type),
    );
    await validateCreateConnectionData(createConnectionData);

    createConnectionData = await processAWSConnection(createConnectionData);
    let isConnectionTestedSuccessfully: boolean = false;
    if (!isConnectionTypeAgent(createConnectionData.connection_parameters.type)) {
      const connectionParamsCopy = { ...createConnectionData.connection_parameters };
      const dao = getDataAccessObject(connectionParamsCopy);
      try {
        const testResult = await dao.testConnect();
        isConnectionTestedSuccessfully = testResult.result;
      } catch (e) {
        const text: string = e.message.toLowerCase();
        isConnectionTestedSuccessfully = false;
        if (text.includes('ssl required') || text.includes('ssl connection required')) {
          createConnectionData.connection_parameters.ssl = true;
          connectionParamsCopy.ssl = true;
          try {
            const updatedDao = getDataAccessObject(connectionParamsCopy);
            const sslTestResult = await updatedDao.testConnect();
            isConnectionTestedSuccessfully = sslTestResult.result;
          } catch (_e) {
            isConnectionTestedSuccessfully = false;
            createConnectionData.connection_parameters.ssl = false;
            connectionParamsCopy.ssl = false;
          }
        }
      }
    }
    let connectionCopy: ConnectionEntity = null;
    try {
      const createdConnection: ConnectionEntity = await buildConnectionEntity(createConnectionData, connectionAuthor);
      const savedConnection: ConnectionEntity =
        await this._dbContext.connectionRepository.saveNewConnection(createdConnection);

      connectionCopy = { ...savedConnection } as ConnectionEntity;
      if (savedConnection.masterEncryption && masterPwd && !isConnectionTypeAgent(savedConnection.type)) {
        connectionCopy = Encryptor.decryptConnectionCredentials(connectionCopy, masterPwd);
      }

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
      await slackPostMessage(
        Messages.USER_CREATED_CONNECTION(connectionAuthor.email, createConnectionData.connection_parameters.type),
      );
      const connectionRO = buildCreatedConnectionDs(savedConnection, token, masterPwd);
      return connectionRO;
    } catch (e) {
      throw e;
    } finally {
      if (isConnectionTestedSuccessfully && !isConnectionTypeAgent(connectionCopy.type)) {
        await this.sharedJobsService.scanDatabaseAndCreateWidgets(connectionCopy);
      }
    }
  }
}
