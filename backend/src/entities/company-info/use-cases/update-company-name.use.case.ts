import { Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { UpdateCompanyNameDS } from '../application/data-structures/update-company-name.ds.js';
import { IUpdateCompanyName } from './company-info-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class UpdateCompanyNameUseCase
  extends AbstractUseCase<UpdateCompanyNameDS, SuccessResponse>
  implements IUpdateCompanyName
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: UpdateCompanyNameDS): Promise<SuccessResponse> {
    const { companyId, name } = inputData;
    const foundCompany = await this._dbContext.companyInfoRepository.findOneBy({ id: companyId });
    foundCompany.name = name;
    await this._dbContext.companyInfoRepository.save(foundCompany);
    return {
      success: true,
    };
  }
}
