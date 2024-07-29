import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGetUsersInCompany } from './company-info-use-cases.interface.js';
import { SimpleFoundUserInfoDs } from '../../user/dto/found-user.dto.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { buildSimpleUserInfoDs } from '../../user/utils/build-created-user.ds.js';

@Injectable()
export class GetAllUsersInCompanyUseCase
  extends AbstractUseCase<string, Array<SimpleFoundUserInfoDs>>
  implements IGetUsersInCompany
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(companyId: string): Promise<Array<SimpleFoundUserInfoDs>> {
    const foundCompany = await this._dbContext.companyInfoRepository.findCompanyInfoWithUsersById(companyId);
    if (!foundCompany) {
      throw new HttpException(
        {
          message: Messages.COMPANY_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return foundCompany.users.map((user) => buildSimpleUserInfoDs(user));
  }
}
