import { BadRequestException, Inject, Injectable, InternalServerErrorException, Scope } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
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
import { processAWSConnection } from '../utils/process-aws-connection.util.js';
import { validateCreateConnectionData } from '../utils/validate-create-connection-data.js';
import { ICreateConnection } from './use-cases.interfaces.js';
import { UserRoleEnum } from '../../user/enums/user-role.enum.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { SubscriptionLevelEnum } from '../../../enums/subscription-level.enum.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { NonAvailableInFreePlanException } from '../../../exceptions/custom-exceptions/non-available-in-free-plan-exception.js';
import { isTest } from '../../../helpers/app/is-test.js';

@Injectable({ scope: Scope.REQUEST })
export class CreateConnectionUseCase
  extends AbstractUseCase<CreateConnectionDs, CreatedConnectionDTO>
  implements ICreateConnection
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
  ) {
    super();
  }
  protected async implementation(createConnectionData: CreateConnectionDs): Promise<CreatedConnectionDTO> {
    const {
      creation_info: { authorId, masterPwd },
    } = createConnectionData;
    const connectionAuthor: UserEntity = await this._dbContext.userRepository.findOneUserById(authorId);

    if (isSaaS() && !isTest()) {
      const userCompany = await this._dbContext.companyInfoRepository.finOneCompanyInfoByUserId(authorId);
      const companyInfoFromSaas = await this.saasCompanyGatewayService.getCompanyInfo(userCompany.id);
      if (companyInfoFromSaas.subscriptionLevel === SubscriptionLevelEnum.FREE_PLAN) {
        if (Constants.NON_FREE_PLAN_CONNECTION_TYPES.includes(createConnectionData.connection_parameters.type)) {
          throw new NonAvailableInFreePlanException(
            Messages.CANNOT_CREATE_CONNECTION_THIS_TYPE_IN_FREE_PLAN(createConnectionData.connection_parameters.type),
          );
        }
      }
    }

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

    if (!isConnectionTypeAgent(createConnectionData.connection_parameters.type)) {
      const connectionParamsCopy = { ...createConnectionData.connection_parameters };
      const dao = getDataAccessObject(connectionParamsCopy);
      try {
        await dao.testConnect();
      } catch (e) {
        const text: string = e.message.toLowerCase();
        if (text.includes('ssl required') || text.includes('ssl connection required')) {
          createConnectionData.connection_parameters.ssl = true;
          connectionParamsCopy.ssl = true;
          try {
            const updatedDao = getDataAccessObject(connectionParamsCopy);
            await updatedDao.testConnect();
          } catch (_e) {
            createConnectionData.connection_parameters.ssl = false;
            connectionParamsCopy.ssl = false;
          }
        }
      }
    }

    const createdConnection: ConnectionEntity = await buildConnectionEntity(createConnectionData, connectionAuthor);

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
    await slackPostMessage(
      Messages.USER_CREATED_CONNECTION(connectionAuthor.email, createConnectionData.connection_parameters.type),
    );
    return buildCreatedConnectionDs(savedConnection, token, masterPwd);
  }
}
