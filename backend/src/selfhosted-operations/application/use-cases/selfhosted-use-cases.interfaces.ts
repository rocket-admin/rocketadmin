import { SimpleFoundUserInfoDs } from '../../../entities/user/dto/found-user.dto.js';
import { InTransactionEnum } from '../../../enums/index.js';
import { CreateInitialUserDs } from '../data-structures/create-initial-user.ds.js';
import { IsConfiguredRo } from '../responce-objects/is-configured.ro.js';

export interface IIsConfiguredUseCase {
	execute(inputData: undefined, inTransaction: InTransactionEnum): Promise<IsConfiguredRo>;
}

export interface ICreateInitialUserUseCase {
	execute(inputData: CreateInitialUserDs, inTransaction: InTransactionEnum): Promise<SimpleFoundUserInfoDs>;
}
