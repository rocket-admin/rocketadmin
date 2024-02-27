import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { SimpleFoundUserInfoDs } from '../../user/application/data-structures/found-user.ds.js';
import { IToken } from '../../user/utils/generate-gwt-token.js';
import { AcceptUserValidationInCompany } from '../application/data-structures/accept-user-invitation-in-company.ds.js';
import {
  FoundUserCompanyInfoDs,
  FoundUserEmailCompaniesInfoDs,
  FoundUserFullCompanyInfoDs,
} from '../application/data-structures/found-company-info.ds.js';
import { FoundCompanyNameDs } from '../application/data-structures/found-company-name.ds.js';
import { InviteUserInCompanyAndConnectionGroupDs } from '../application/data-structures/invite-user-in-company-and-connection-group.ds.js';
import { InvitedUserInCompanyAndConnectionGroupDs } from '../application/data-structures/invited-user-in-company-and-connection-group.ds.js';
import { RemoveUserFromCompanyDs } from '../application/data-structures/remove-user-from-company.ds.js';
import { RevokeUserInvitationDs } from '../application/data-structures/revoke-user-invitation.dto.js';
import { UpdateCompanyNameDS } from '../application/data-structures/update-company-name.ds.js';
import { UpdateUsers2faStatusInCompanyDs } from '../application/data-structures/update-users-2fa-status-in-company.ds.js';
import { UpdateUsersCompanyRolesDs } from '../application/data-structures/update-users-company-roles.ds.js';

export interface IInviteUserInCompanyAndConnectionGroup {
  execute(inputData: InviteUserInCompanyAndConnectionGroupDs): Promise<InvitedUserInCompanyAndConnectionGroupDs>;
}

export interface IVerifyInviteUserInCompanyAndConnectionGroup {
  execute(inputData: AcceptUserValidationInCompany, inTransaction?: InTransactionEnum): Promise<IToken>;
}

export interface IGetUserCompany {
  execute(userId: string): Promise<FoundUserCompanyInfoDs>;
}

export interface IGetCompanyName {
  execute(companyId: string): Promise<FoundCompanyNameDs>;
}

export interface IGetUserFullCompanyInfo {
  execute(userId: string): Promise<FoundUserCompanyInfoDs | FoundUserFullCompanyInfoDs>;
}

export interface IGetUsersInCompany {
  execute(companyId: string): Promise<Array<SimpleFoundUserInfoDs>>;
}

export interface IGetUserEmailCompanies {
  execute(userEmail: string): Promise<Array<FoundUserEmailCompaniesInfoDs>>;
}

export interface IRemoveUserFromCompany {
  execute(inputData: RemoveUserFromCompanyDs, inTransaction: InTransactionEnum): Promise<SuccessResponse>;
}

export interface IRevokeUserInvitationInCompany {
  execute(inputData: RevokeUserInvitationDs, inTransaction: InTransactionEnum): Promise<SuccessResponse>;
}

export interface IUpdateCompanyName {
  execute(inputData: UpdateCompanyNameDS, inTransaction: InTransactionEnum): Promise<SuccessResponse>;
}

export interface IUpdateUsersCompanyRoles {
  execute(inputData: UpdateUsersCompanyRolesDs, inTransaction: InTransactionEnum): Promise<SuccessResponse>;
}

export interface IDeleteCompany {
  execute(userId: string, inTransaction: InTransactionEnum): Promise<SuccessResponse>;
}

export interface ICheckVerificationLinkAvailable {
  execute(verificationString: string): Promise<SuccessResponse>;
}

export interface IUpdateUsers2faStatusInCompany {
  execute(inputData: UpdateUsers2faStatusInCompanyDs, inTransaction: InTransactionEnum): Promise<SuccessResponse>;
}
