import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { ValidationHelper } from '../../../helpers/validators/validation-helper.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { UpdateUserEmailAsAdminDs } from '../data-structures/update-user-as-admin.ds.js';
import { IUpdateUserEmailAsAdminUseCase } from './selfhosted-use-cases.interfaces.js';

// Plan 15 Phase 6 (rev 5): self-hosted has no email-change verification flow — a company
// admin updates the address directly. Uniqueness rule matches VerifyChangeUserEmailUseCase.
@Injectable()
export class UpdateUserEmailAsAdminUseCase
	extends AbstractUseCase<UpdateUserEmailAsAdminDs, SuccessResponse>
	implements IUpdateUserEmailAsAdminUseCase
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: UpdateUserEmailAsAdminDs): Promise<SuccessResponse> {
		if (isSaaS()) {
			throw new BadRequestException(Messages.ENDPOINT_NOT_AVAILABLE_IN_THIS_MODE);
		}
		const { callerUserId, targetUserId } = inputData;
		const newEmail = inputData.newEmail.toLowerCase();
		ValidationHelper.validateOrThrowHttpExceptionEmail(newEmail);

		const foundExistingUsersWithThisEmail = await this._dbContext.userRepository.find({
			where: { email: newEmail },
		});
		if (foundExistingUsersWithThisEmail.length > 0) {
			throw new HttpException(
				{
					message: Messages.CANNOT_SET_THIS_EMAIL,
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		const targetUser = await this.findTargetUserInCallerCompany(this._dbContext, callerUserId, targetUserId);
		targetUser.email = newEmail;
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
