import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { sendEmailChanged } from '../../email/send-email.js';
import { ChangeUserEmailDs } from '../application/data-structures/change-user-email.ds.js';
import { OperationResultMessageDs } from '../application/data-structures/operation-result-message.ds.js';
import { IVerifyEmailChange } from './user-use-cases.interfaces.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { SaasUserGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-user-gateway.service.js';

@Injectable({ scope: Scope.REQUEST })
export class VerifyChangeUserEmailUseCase
  extends AbstractUseCase<ChangeUserEmailDs, OperationResultMessageDs>
  implements IVerifyEmailChange
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly userGatewayService: SaasUserGatewayService,
  ) {
    super();
  }

  protected async implementation(inputData: ChangeUserEmailDs): Promise<OperationResultMessageDs> {
    const { newEmail, verificationString } = inputData;
    const verificationEntity =
      await this._dbContext.emailChangeRepository.findEmailChangeWithVerificationString(verificationString);
    if (!verificationEntity || !verificationEntity.user) {
      throw new HttpException(
        {
          message: Messages.PASSWORD_RESET_VERIFICATION_FAILED,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const foundUser = await this._dbContext.userRepository.findOneUserById(verificationEntity.user.id);
    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    if (isSaaS()) {
      const emailUpdateInSaasResult = await this.userGatewayService.updateUserEmailInSaas(foundUser.id, newEmail);
      if (!emailUpdateInSaasResult) {
        throw new HttpException(
          {
            message: Messages.FAILED_UPDATE_USER_EMAIL_IN_SAAS,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
    foundUser.email = newEmail;
    await this._dbContext.userRepository.saveUserEntity(foundUser);
    await this._dbContext.emailChangeRepository.removeEmailChangeEntity(verificationEntity);
    await sendEmailChanged(newEmail);
    return { message: Messages.EMAIL_CHANGED };
  }
}
