import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { FoundUserInfoRO } from '../data-structures/found-user-info.ro.js';
import { GetUserInfoByIdDS } from '../data-structures/get-user-info.ds.js';
import { buildFoundUserInfoRO } from '../utils/build-found-user-info-ro.js';
import { IGetUserInfo } from './saas-use-cases.interface.js';

@Injectable()
export class GetUserInfoUseCase extends AbstractUseCase<GetUserInfoByIdDS, FoundUserInfoRO> implements IGetUserInfo {
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: GetUserInfoByIdDS): Promise<FoundUserInfoRO> {
		const { userId, companyId } = inputData;
		const foundUser = companyId
			? await this._dbContext.userRepository.findOneUserByIdAndCompanyId(userId, companyId)
			: await this._dbContext.userRepository.findOneUserById(userId);
		if (!foundUser) {
			throw new HttpException(
				{
					message: Messages.USER_NOT_FOUND,
				},
				HttpStatus.BAD_REQUEST,
			);
		}
		return buildFoundUserInfoRO(foundUser);
	}
}
