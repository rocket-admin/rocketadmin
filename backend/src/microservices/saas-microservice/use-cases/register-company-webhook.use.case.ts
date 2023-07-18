import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { RegisterCompanyWebhookDS } from '../data-structures/register-company.ds.js';
import { RegisteredCompanyDS } from '../data-structures/registered-company.ds.js';
import { ICompanyRegistration } from './saas-use-cases.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { Messages } from '../../../exceptions/text/messages.js';

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
    const { companyId, registrarUserId } = inputData;
    const foundUser = await this._dbContext.userRepository.findOneUserById(registrarUserId);
    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    foundUser.companyIds.push(companyId);
    const savedUser = await this._dbContext.userRepository.saveUserEntity(foundUser);
    return {
      userId: savedUser.id,
      companyIds: savedUser.companyIds,
    };
  }
}
