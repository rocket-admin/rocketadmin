import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isConnectionEntityAgent } from '../../../helpers/index.js';
import { RestoredConnectionDs } from '../application/data-structures/restored-connection.ds.js';
import { UpdateConnectionDs } from '../application/data-structures/update-connection.ds.js';
import { buildCreatedConnectionDs } from '../utils/build-created-connection.ds.js';
import { isHostAllowed } from '../utils/is-host-allowed.js';
import { isHostTest } from '../utils/is-test-connection-util.js';
import { updateConnectionEntityForRestoration } from '../utils/update-connection-entity-for-restoration.js';
import { IRestoreConnection } from './use-cases.interfaces.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { SubscriptionLevelEnum } from '../../../enums/subscription-level.enum.js';
import { NonAvailableInFreePlanException } from '../../../exceptions/custom-exceptions/non-available-in-free-plan-exception.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { isTest } from '../../../helpers/app/is-test.js';

@Injectable()
export class RestoreConnectionUseCase
  extends AbstractUseCase<UpdateConnectionDs, RestoredConnectionDs>
  implements IRestoreConnection
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
  ) {
    super();
  }

  protected async implementation(connectionData: UpdateConnectionDs): Promise<RestoredConnectionDs> {
    const {
      connection_parameters,
      update_info: { connectionId, authorId },
    } = connectionData;

    if (connection_parameters.masterEncryption && !connectionData.update_info.masterPwd) {
      throw new HttpException(
        {
          message: Messages.MASTER_PASSWORD_REQUIRED,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const foundConnection = await this._dbContext.connectionRepository.findOneById(connectionId);
    if (!foundConnection) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const hostCheckingResult = await isHostAllowed(connection_parameters);
    if (!hostCheckingResult) {
      throw new HttpException(
        {
          message: Messages.CANNOT_CREATE_CONNECTION_TO_THIS_HOST,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    if (isSaaS() && !isTest()) {
      const userCompany = await this._dbContext.companyInfoRepository.finOneCompanyInfoByUserId(authorId);
      const companyInfoFromSaas = await this.saasCompanyGatewayService.getCompanyInfo(userCompany.id);
      if (companyInfoFromSaas.subscriptionLevel === SubscriptionLevelEnum.FREE_PLAN) {
        if (Constants.NON_FREE_PLAN_CONNECTION_TYPES.includes(connection_parameters.type)) {
          throw new NonAvailableInFreePlanException(
            Messages.CANNOT_CREATE_CONNECTION_THIS_TYPE_IN_FREE_PLAN(connection_parameters.type),
          );
        }
      }
    }

    const isTestConnection = isHostTest(connectionData.connection_parameters.host);
    const updatedConnection = await updateConnectionEntityForRestoration(
      foundConnection,
      connectionData,
      isTestConnection,
    );
    if (isConnectionEntityAgent(updatedConnection)) {
      updatedConnection.agent = await this._dbContext.agentRepository.createNewAgentForConnection(updatedConnection);
    }
    const savedConnection = await this._dbContext.connectionRepository.save(updatedConnection);
    const foundConnectionAfterSave = await this._dbContext.connectionRepository.findOne({
      where: { id: savedConnection.id },
    });
    const token = updatedConnection.agent?.token || null;
    return {
      connection: buildCreatedConnectionDs(foundConnectionAfterSave, token, connectionData.update_info.masterPwd),
    };
  }
}
