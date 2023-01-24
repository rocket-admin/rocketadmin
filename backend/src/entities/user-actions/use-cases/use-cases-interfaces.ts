import { InTransactionEnum } from '../../../enums/index.js';
import { CreateUserActionDs } from '../application/data-sctructures/create-user-action.ds.js';
import { CreatedUserActionDs } from '../application/data-sctructures/created-user-action.ds.js';

export interface ICreateUserAction {
  execute(actionData: CreateUserActionDs, inTransaction: InTransactionEnum): Promise<CreatedUserActionDs>;
}

export interface ICheckUsersLogsAndUpdateActionsUseCase {
  execute(): Promise<void>;
}

export interface ICheckUsersActionsAndMailingUsers {
  execute(): Promise<Array<string>>;
}
