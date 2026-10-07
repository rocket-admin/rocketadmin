import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { SaasCompanyMembersRO } from '../../../microservices/saas-microservice/data-structures/saas-company-members.dtos.js';
import { buildSimpleUserInfoDs } from '../../user/utils/build-created-user.ds.js';
import { ISaasGetCompanyMembers } from './company-info-use-cases.interface.js';

// Company membership for the SaaS members screen: active users AND still-outstanding invitations in
// one response, because that screen always needs both and the two live in different relations.
//
// Deliberately NOT built on `GetAllUsersInCompanyUseCase`: that use case fans out one
// `findAllUserNonTestsConnections` query per user to populate `user_membership`/`has_groups`, which
// the SaaS UI does not render — connections and groups are RocketAdmin concepts, not SiteNova ones.
// This keeps the endpoint a fixed two queries regardless of company size.
//
// The invitation rows are mapped WITHOUT `verification_string`: that is the raw invite token, and a
// member listing is readable by every company member. See `SaasFoundInvitationInCompanyDs`.
@Injectable()
export class SaasGetCompanyMembersUseCase
	extends AbstractUseCase<string, SaasCompanyMembersRO>
	implements ISaasGetCompanyMembers
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(companyId: string): Promise<SaasCompanyMembersRO> {
		const [companyWithUsers, companyWithInvitations] = await Promise.all([
			this._dbContext.companyInfoRepository.findCompanyInfoWithUsersById(companyId),
			this._dbContext.companyInfoRepository.findCompanyWithInvitationsById(companyId),
		]);

		if (!companyWithUsers) {
			throw new HttpException(
				{
					message: Messages.COMPANY_NOT_FOUND,
				},
				HttpStatus.NOT_FOUND,
			);
		}

		const users = (companyWithUsers.users ?? [])
			.map((user) => buildSimpleUserInfoDs(user))
			.filter((user) => !!user)
			.map((user) => ({ ...user, has_groups: false, user_membership: [] }));

		const invitations = (companyWithInvitations?.invitations ?? []).map((invitation) => ({
			id: invitation.id,
			groupId: invitation.groupId,
			inviterId: invitation.inviterId,
			invitedUserEmail: invitation.invitedUserEmail,
			role: invitation.role,
			createdAt: invitation.createdAt,
		}));

		return { users, invitations };
	}
}
