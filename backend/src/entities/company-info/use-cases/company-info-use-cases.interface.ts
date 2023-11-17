import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { SimpleFoundUserInfoDs } from '../../user/application/data-structures/found-user.ds.js';
import { IToken } from '../../user/utils/generate-gwt-token.js';
import { AcceptUserValidationInCompany } from '../application/data-structures/accept-user-invitation-in-company.ds.js';
import {
  FoundUserCompanyInfoDs,
  FoundUserEmailCompaniesInfoDs,
  FoundUserFullCompanyInfoDs,
} from '../application/data-structures/found-company-info.ds.js';
import { InviteUserInCompanyAndConnectionGroupDs } from '../application/data-structures/invite-user-in-company-and-connection-group.ds.js';
import { InvitedUserInCompanyAndConnectionGroupDs } from '../application/data-structures/invited-user-in-company-and-connection-group.ds.js';
import { RemoveUserFromCompanyDs } from '../application/data-structures/remove-user-from-company.ds.js';

export interface IInviteUserInCompanyAndConnectionGroup {
  execute(inputData: InviteUserInCompanyAndConnectionGroupDs): Promise<InvitedUserInCompanyAndConnectionGroupDs>;
}

export interface IVerifyInviteUserInCompanyAndConnectionGroup {
  execute(inputData: AcceptUserValidationInCompany): Promise<IToken>;
}

export interface IGetUserCompany {
  execute(userId: string): Promise<FoundUserCompanyInfoDs>;
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
  execute(inputData: RemoveUserFromCompanyDs): Promise<SuccessResponse>;
}

export interface IRevokeUserInvitationInCompany {
  execute(inputData: RemoveUserFromCompanyDs): Promise<SuccessResponse>;
}
