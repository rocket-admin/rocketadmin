import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { IDeleteCompanyLogo } from './company-info-use-cases.interface.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';

@Injectable()
export class DeleteCompanyLogoUseCase extends AbstractUseCase<string, SuccessResponse> implements IDeleteCompanyLogo {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(companyId: string): Promise<SuccessResponse> {
    const company = await this._dbContext.companyInfoRepository.findCompanyWithLogo(companyId);
    if (!company) {
      throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
    }

    const logoForDeletion = await this._dbContext.companyLogoRepository.findOne({
      where: {
        company: {
          id: companyId,
        },
      },
    });

    if (!logoForDeletion) {
      throw new NotFoundException(Messages.COMPANY_LOGO_NOT_FOUND);
    }

    await this._dbContext.companyLogoRepository.remove(logoForDeletion);
    return { success: true };
  }
}
