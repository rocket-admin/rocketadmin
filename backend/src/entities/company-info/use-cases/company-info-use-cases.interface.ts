import { IToken } from '../../user/utils/generate-gwt-token.js';
import { AcceptUserValidationInCompany } from '../application/data-structures/accept-user-invitation-in-company.ds.js';
import { InviteUserInCompanyAndConnectionGroupDs } from '../application/data-structures/invite-user-in-company-and-connection-group.ds.js';
import { InvitedUserInCompanyAndConnectionGroupDs } from '../application/data-structures/invited-user-in-company-and-connection-group.ds.js';

export interface IInviteUserInCompanyAndConnectionGroup {
  execute(inputData: InviteUserInCompanyAndConnectionGroupDs): Promise<InvitedUserInCompanyAndConnectionGroupDs>;
}

export interface IVerifyInviteUserInCompanyAndConnectionGroup {
  execute(inputData: AcceptUserValidationInCompany): Promise<IToken>;
}
