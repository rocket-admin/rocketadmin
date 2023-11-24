import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { IGetCompanyName } from './company-info-use-cases.interface.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { FoundCompanyNameDs } from '../application/data-structures/found-company-name.ds.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';

@Injectable()
export class GetCompanyNameUseCase extends AbstractUseCase<string, FoundCompanyNameDs> implements IGetCompanyName {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: string): Promise<FoundCompanyNameDs> {
    const foundCompany = await this._dbContext.companyInfoRepository.findOneBy({ id: inputData });
    if (!foundCompany) {
      throw new HttpException(
        {
          message: Messages.COMPANY_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      id: foundCompany.id,
      name: foundCompany.name,
    };
  }
}
