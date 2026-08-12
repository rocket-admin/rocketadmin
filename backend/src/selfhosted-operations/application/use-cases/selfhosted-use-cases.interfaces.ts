import { SimpleFoundUserInfoDs } from '../../../entities/user/dto/found-user.dto.js';
import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { CreateInitialUserDs } from '../data-structures/create-initial-user.ds.js';
import { UpdateUserEmailAsAdminDs, UpdateUserPasswordAsAdminDs } from '../data-structures/update-user-as-admin.ds.js';
import { IsConfiguredRo } from '../responce-objects/is-configured.ro.js';

export interface IIsConfiguredUseCase {
	execute(inputData: undefined, inTransaction: InTransactionEnum): Promise<IsConfiguredRo>;
}

export interface ICreateInitialUserUseCase {
	execute(inputData: CreateInitialUserDs, inTransaction: InTransactionEnum): Promise<SimpleFoundUserInfoDs>;
}

export interface IUpdateUserPasswordAsAdminUseCase {
	execute(inputData: UpdateUserPasswordAsAdminDs, inTransaction: InTransactionEnum): Promise<SuccessResponse>;
}

export interface IUpdateUserEmailAsAdminUseCase {
	execute(inputData: UpdateUserEmailAsAdminDs, inTransaction: InTransactionEnum): Promise<SuccessResponse>;
}
