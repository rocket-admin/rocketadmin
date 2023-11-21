import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { RegisterCompanyWebhookDS } from '../data-structures/register-company.ds.js';
import { RegisteredCompanyDS } from '../data-structures/registered-company.ds.js';
import { ICompanyRegistration } from './saas-use-cases.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { CompanyInfoEntity } from '../../../entities/company-info/company-info.entity.js';

@Injectable()
export class RegisteredCompanyWebhookUseCase
  extends AbstractUseCase<RegisterCompanyWebhookDS, RegisteredCompanyDS>
  implements ICompanyRegistration
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: RegisterCompanyWebhookDS): Promise<RegisteredCompanyDS> {
    const { companyId, registrarUserId, companyName } = inputData;
    const foundUser = await this._dbContext.userRepository.findOneUserById(registrarUserId);
    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    const foundCompanyInfo = await this._dbContext.companyInfoRepository.findCompanyInfoWithUsersById(companyId);
    if (foundCompanyInfo) {
      throw new HttpException(
        {
          message: Messages.COMPANY_ALREADY_EXISTS,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const newCompanyInfo = new CompanyInfoEntity();
    newCompanyInfo.name = companyName;
    newCompanyInfo.id = companyId;
    newCompanyInfo.users = [foundUser];
    const savedCompanyInfo = await this._dbContext.companyInfoRepository.save(newCompanyInfo);
    const savedUser = await this._dbContext.userRepository.saveUserEntity(foundUser);
    return {
      userId: savedUser.id,
      companyId: savedCompanyInfo.id,
    };
  }
}
