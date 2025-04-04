import { Inject, Injectable, Scope } from '@nestjs/common';
import { SuccessResponse } from '../data-structures/common-responce.ds.js';
import { FreezeConnectionsInCompanyDS } from '../data-structures/freeze-connections-in-company.ds.js';
import { IFreezeConnectionsInCompany } from './saas-use-cases.interface.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';

@Injectable({ scope: Scope.REQUEST })
export class FreezeConnectionsInCompanyUseCase
  extends AbstractUseCase<FreezeConnectionsInCompanyDS, SuccessResponse>
  implements IFreezeConnectionsInCompany
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: FreezeConnectionsInCompanyDS): Promise<SuccessResponse> {
    const { companyIds } = inputData;
    const companyPaidConnections = await this._dbContext.companyInfoRepository.findCompaniesPaidConnections(companyIds);
    const connectionsIds = companyPaidConnections.map((connection) => connection.id);
    await this._dbContext.connectionRepository.freezeConnections(connectionsIds);
    return { success: true };
  }
}
