import { HttpException, HttpStatus, Inject } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { AddUserInGroupWithSaaSDs } from '../application/data-sctructures/add-user-in-group.ds.js';
import { AddedUserInGroupDs } from '../application/data-sctructures/added-user-in-group.ds.js';
import { IAddUserInGroup } from './use-cases.interfaces.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { buildFoundGroupResponseDto } from '../utils/biuld-found-group-response.dto.js';
import { slackPostMessage } from '../../../helpers/index.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { EmailService } from '../../email/email/email.service.js';

export class AddUserInGroupUseCase
  extends AbstractUseCase<AddUserInGroupWithSaaSDs, AddedUserInGroupDs>
  implements IAddUserInGroup
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  protected async implementation(inputData: AddUserInGroupWithSaaSDs): Promise<AddedUserInGroupDs> {
    const { groupId } = inputData;
    const email = inputData.email.toLowerCase();
    const foundGroup = await this._dbContext.groupRepository.findGroupByIdWithConnectionAndUsers(groupId);

    const foundConnection =
      await this._dbContext.connectionRepository.getConnectionByGroupIdWithCompanyAndUsersInCompany(groupId);

    if (!foundConnection) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (!foundConnection.company || !foundConnection.company.id) {
      throw new HttpException(
        {
          message: Messages.COMPANY_NOT_EXISTS_IN_CONNECTION,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const companyWithUsers = await this._dbContext.companyInfoRepository.findCompanyInfoWithUsersById(
      foundConnection.company.id,
    );

    if (!companyWithUsers) {
      throw new HttpException(
        {
          message: Messages.COMPANY_NOT_EXISTS_IN_CONNECTION,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const foundUser = companyWithUsers.users.find((u) => u.email.toLowerCase() === email);
    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_INVITED_IN_COMPANY(email),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    //todo remove in future
    if (isSaaS()) {
      const saasFoundCompany = await this.saasCompanyGatewayService.getCompanyInfo(foundConnection.company.id);
      const saasFoundUserInCompany = saasFoundCompany?.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

      if (foundUser && !saasFoundUserInCompany && saasFoundCompany.users.length) {
        await slackPostMessage(`probable desynchronization of users (adding a user to a group, user not found is saas, but found in core)
          user: ${email}, company: ${foundConnection.company.id}`);
      }
    }

    const userAlreadyAdded = !!foundGroup.users.find((u) => u.id === foundUser.id);
    if (userAlreadyAdded) {
      throw new HttpException(
        {
          message: Messages.USER_ALREADY_ADDED,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    foundGroup.users.push(foundUser);
    const savedGroup = await this._dbContext.groupRepository.saveNewOrUpdatedGroup(foundGroup);
    await this.emailService.sendInvitedInNewGroup(foundUser.email.toLowerCase(), foundGroup.title);
    return {
      group: buildFoundGroupResponseDto(savedGroup),
      message: Messages.USER_ADDED_IN_GROUP(foundUser.email.toLowerCase()),
      external_invite: false,
    };
  }
}
