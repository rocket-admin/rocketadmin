import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { ToggleTestConnectionDisplayModeDs } from '../application/data-structures/toggle-test-connections-display-mode.ds.js';
import { IToggleCompanyTestConnectionsMode } from './company-info-use-cases.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { Messages } from '../../../exceptions/text/messages.js';

@Injectable({ scope: Scope.REQUEST })
export class ToggleCompanyTestConnectionsDisplayModeUseCase
  extends AbstractUseCase<ToggleTestConnectionDisplayModeDs, SuccessResponse>
  implements IToggleCompanyTestConnectionsMode
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  public async implementation(inputData: ToggleTestConnectionDisplayModeDs): Promise<SuccessResponse> {
    const { userId, displayMode } = inputData;
    const foundCompanyInfo = await this._dbContext.companyInfoRepository.finOneCompanyInfoByUserId(userId);
    if (!foundCompanyInfo) {
      throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
    }

    const companyToUpdate = await this._dbContext.companyInfoRepository.findOne({ where: { id: foundCompanyInfo.id } });
    companyToUpdate.show_test_connections = displayMode;
    await this._dbContext.companyInfoRepository.save(companyToUpdate);
    return {
      success: true,
    };
  }
}
