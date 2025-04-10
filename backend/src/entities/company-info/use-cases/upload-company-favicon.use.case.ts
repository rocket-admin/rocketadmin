import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { CompanyFaviconEntity } from '../../company-favicon/company-favicon.entity.js';
import { UploadCompanyWhiteLabelImages } from '../application/data-structures/upload-company-white-label-images.ds.js';
import { IUploadCompanyWhiteLabelImages } from './company-info-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class UploadCompanyFaviconUseCase
  extends AbstractUseCase<UploadCompanyWhiteLabelImages, SuccessResponse>
  implements IUploadCompanyWhiteLabelImages
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: UploadCompanyWhiteLabelImages): Promise<SuccessResponse> {
    const { companyId, file } = inputData;
    const company = await this._dbContext.companyInfoRepository.findCompanyWithFavicon(companyId);
    if (!company) {
      throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
    }

    if (company.favicon) {
      const faviconForDeletion = await this._dbContext.companyFaviconRepository.findOne({
        where: {
          company: {
            id: companyId,
          },
        },
      });
      if (faviconForDeletion) {
        await this._dbContext.companyFaviconRepository.remove(faviconForDeletion);
      }
    }

    const newFavicon = new CompanyFaviconEntity();
    newFavicon.company = company;
    newFavicon.image = file.buffer;
    newFavicon.mimeType = file.mimetype;
    await this._dbContext.companyFaviconRepository.save(newFavicon);
    return { success: true };
  }
}
