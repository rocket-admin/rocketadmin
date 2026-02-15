import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { CompanyInfoEntity } from '../../../entities/company-info/company-info.entity.js';
import { RegisterUserDs } from '../../../entities/user/application/data-structures/register-user-ds.js';
import { SimpleFoundUserInfoDs } from '../../../entities/user/dto/found-user.dto.js';
import { UserRoleEnum } from '../../../entities/user/enums/user-role.enum.js';
import { buildSimpleUserInfoDs } from '../../../entities/user/utils/build-created-user.ds.js';
import { buildRegisteringUser } from '../../../entities/user/utils/build-registering-user.util.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { CreateInitialUserDs } from '../data-structures/create-initial-user.ds.js';
import { ICreateInitialUserUseCase } from './selfhosted-use-cases.interfaces.js';

@Injectable()
export class CreateInitialUserUseCase
	extends AbstractUseCase<CreateInitialUserDs, SimpleFoundUserInfoDs>
	implements ICreateInitialUserUseCase
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: CreateInitialUserDs): Promise<SimpleFoundUserInfoDs> {
		if (isSaaS()) {
			throw new BadRequestException(Messages.ENDPOINT_NOT_AVAILABLE_IN_THIS_MODE);
		}

		const userCount = await this._dbContext.userRepository.count();
		if (userCount > 0) {
			throw new BadRequestException(Messages.SELF_HOSTED_ALREADY_CONFIGURED);
		}

		const { email, password } = inputData;
		const registerUserData: RegisterUserDs = {
			email: email,
			password: password,
			isActive: true,
			gclidValue: null,
			name: 'Admin',
			role: UserRoleEnum.ADMIN,
		};

		const savedUser = await this._dbContext.userRepository.saveUserEntity(buildRegisteringUser(registerUserData));

		const newCompanyInfo = new CompanyInfoEntity();
		newCompanyInfo.id = Encryptor.generateUUID();
		const savedCompanyInfo = await this._dbContext.companyInfoRepository.save(newCompanyInfo);

		savedUser.company = savedCompanyInfo;
		const finalUser = await this._dbContext.userRepository.saveUserEntity(savedUser);

		return buildSimpleUserInfoDs(finalUser);
	}
}
