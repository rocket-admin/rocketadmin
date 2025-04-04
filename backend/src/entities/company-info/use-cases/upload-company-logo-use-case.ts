import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { IUploadCompanyLogo } from './company-info-use-cases.interface.js';
import { UploadCompanyLogoDs } from '../application/data-structures/upload-company-logo.ds.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { CompanyLogoEntity } from '../../company-logo/company-logo.entity.js';

@Injectable({ scope: Scope.REQUEST })
export class UploadCompanyLogoUseCase
  extends AbstractUseCase<UploadCompanyLogoDs, SuccessResponse>
  implements IUploadCompanyLogo
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: UploadCompanyLogoDs): Promise<SuccessResponse> {
    const { companyId, file } = inputData;
    const company = await this._dbContext.companyInfoRepository.findCompanyWithLogo(companyId);
    if (!company) {
      throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
    }

    if (company.logo) {
      const logoForDeletion = await this._dbContext.companyLogoRepository.findOne({
        where: {
          company: {
            id: companyId,
          },
        },
      });
      if (logoForDeletion) {
        await this._dbContext.companyLogoRepository.remove(logoForDeletion);
      }
    }

    const newLogo = new CompanyLogoEntity();
    newLogo.company = company;
    newLogo.image = file.buffer;
    newLogo.mimeType = file.mimetype;
    await this._dbContext.companyLogoRepository.save(newLogo);
    return { success: true };
  }
}
