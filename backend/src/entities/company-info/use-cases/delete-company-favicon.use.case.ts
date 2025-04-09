import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { IDeleteCompanyWhiteLabelImages } from './company-info-use-cases.interface.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';

@Injectable()
export class DeleteCompanyFaviconUseCase
  extends AbstractUseCase<string, SuccessResponse>
  implements IDeleteCompanyWhiteLabelImages
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(companyId: string): Promise<SuccessResponse> {
    const company = await this._dbContext.companyInfoRepository.findCompanyWithFavicon(companyId);
    if (!company) {
      throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
    }

    const faviconForDeletion = await this._dbContext.companyFaviconRepository.findOne({
      where: {
        company: {
          id: companyId,
        },
      },
    });

    if (!faviconForDeletion) {
      throw new NotFoundException(Messages.COMPANY_FAVICON_NOT_FOUND);
    }

    await this._dbContext.companyFaviconRepository.remove(faviconForDeletion);
    return { success: true };
  }
}
