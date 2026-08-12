import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { ValidationHelper } from '../../../helpers/validators/validation-helper.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { UpdateUserPasswordAsAdminDs } from '../data-structures/update-user-as-admin.ds.js';
import { IUpdateUserPasswordAsAdminUseCase } from './selfhosted-use-cases.interfaces.js';

// Plan 15 Phase 6 (rev 5): self-hosted has no email-based password recovery — a company
// admin sets a new password directly. Same strength validation and hashing as the public
// reset flow (VerifyResetUserPasswordUseCase); admin authority replaces the old-password check.
@Injectable()
export class UpdateUserPasswordAsAdminUseCase
	extends AbstractUseCase<UpdateUserPasswordAsAdminDs, SuccessResponse>
	implements IUpdateUserPasswordAsAdminUseCase
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: UpdateUserPasswordAsAdminDs): Promise<SuccessResponse> {
		if (isSaaS()) {
			throw new BadRequestException(Messages.ENDPOINT_NOT_AVAILABLE_IN_THIS_MODE);
		}
		const { callerUserId, targetUserId, newPassword } = inputData;
		ValidationHelper.isPasswordStrongOrThrowError(newPassword);

		const targetUser = await this.findTargetUserInCallerCompany(this._dbContext, callerUserId, targetUserId);
		targetUser.password = await Encryptor.hashUserPassword(newPassword);
		await this._dbContext.userRepository.saveUserEntity(targetUser);
		return { success: true };
	}

	private async findTargetUserInCallerCompany(
		dbContext: IGlobalDatabaseContext,
		callerUserId: string,
		targetUserId: string,
	) {
		const callerCompany = await dbContext.companyInfoRepository.findCompanyInfoByUserId(callerUserId);
		const targetUser = await dbContext.userRepository.findOneUserById(targetUserId);
		// The target must belong to the same company as the acting admin.
		if (!targetUser || !callerCompany || targetUser.company?.id !== callerCompany.id) {
			throw new NotFoundException(Messages.USER_NOT_FOUND);
		}
		return targetUser;
	}
}
