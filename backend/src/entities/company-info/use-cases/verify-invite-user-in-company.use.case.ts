import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { IToken, generateGwtToken } from '../../user/utils/generate-gwt-token.js';
import { IVerifyInviteUserInCompanyAndConnectionGroup } from './company-info-use-cases.interface.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { AcceptUserValidationInCompany } from '../application/data-structures/accept-user-invitation-in-company.ds.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';

@Injectable()
export class VerifyInviteUserInCompanyAndConnectionGroupUseCase
  extends AbstractUseCase<AcceptUserValidationInCompany, IToken>
  implements IVerifyInviteUserInCompanyAndConnectionGroup
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
  ) {
    super();
  }

  protected async implementation(inputData: AcceptUserValidationInCompany): Promise<IToken> {
    const { verificationString, userPassword, userName } = inputData;
    const foundInvitation =
      await this._dbContext.invitationInCompanyRepository.findNonExpiredInvitationInCompanyWithUsersByVerificationString(
        verificationString,
      );
    if (!foundInvitation) {
      throw new HttpException(
        {
          message: Messages.VERIFICATION_LINK_INCORRECT,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const {
      company: { users },
      groupId,
      invitedUserEmail,
      role,
    } = foundInvitation;
    const foundUser = users.find((user) => user.email === invitedUserEmail);
    if (foundUser && foundUser.isActive) {
      throw new HttpException(
        {
          message: Messages.USER_ALREADY_ADDED_IN_COMPANY,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (foundUser && !foundUser.isActive) {
      foundUser.isActive = true;
      foundUser.role = role;
      await this._dbContext.userRepository.saveUserEntity(foundUser);
      return generateGwtToken(foundUser);
    }
    const newUser = await this._dbContext.userRepository.saveRegisteringUser({
      email: invitedUserEmail,
      gclidValue: null,
      password: userPassword,
      isActive: true,
      role,
      name: userName,
    });
    newUser.company = foundInvitation.company;
    const savedUser = await this._dbContext.userRepository.saveUserEntity(newUser);
    if (groupId) {
      const foundGroup = await this._dbContext.groupRepository.findGroupById(groupId);
      if (!foundGroup) {
        throw new HttpException(
          {
            message: Messages.GROUP_NOT_FOUND,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      const userAlreadyIngroup = foundGroup.users.find((user) => user.email === savedUser.email);
      if (!userAlreadyIngroup) {
        foundGroup.users.push(savedUser);
        await this._dbContext.groupRepository.saveNewOrUpdatedGroup(foundGroup);
      }
    }
    await this._dbContext.invitationInCompanyRepository.remove(foundInvitation);
    if (isSaaS) {
      await this.saasCompanyGatewayService.invitationAcceptedWebhook(
        savedUser.id,
        foundInvitation.company.id,
        foundInvitation.role,
        savedUser.email,
      );
    }
    return generateGwtToken(newUser);
  }
}
