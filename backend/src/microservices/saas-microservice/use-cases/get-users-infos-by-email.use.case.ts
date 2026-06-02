import { Inject } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { UserEntity } from '../../../entities/user/user.entity.js';
import { FoundUserInfoWithoutCompanyRO } from '../data-structures/found-user-info.ro.js';
import { GetUsersInfosByEmailDS } from '../data-structures/get-users-infos-by-email.ds.js';
import { buildFoundUserInfoWithoutCompanyRO } from '../utils/build-found-user-info-ro.js';
import { ISaasGetUsersInfosByEmail } from './saas-use-cases.interface.js';

export class GetUsersInfosByEmailUseCase
	extends AbstractUseCase<GetUsersInfosByEmailDS, Array<FoundUserInfoWithoutCompanyRO>>
	implements ISaasGetUsersInfosByEmail
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(usersData: GetUsersInfosByEmailDS): Promise<Array<FoundUserInfoWithoutCompanyRO>> {
		const { userEmail, externalProvider } = usersData;
		const foundUsers: Array<UserEntity> = await this._dbContext.userRepository.findAllUsersWithEmail(
			userEmail,
			externalProvider,
		);
		return foundUsers.map((user) => buildFoundUserInfoWithoutCompanyRO(user));
	}
}
