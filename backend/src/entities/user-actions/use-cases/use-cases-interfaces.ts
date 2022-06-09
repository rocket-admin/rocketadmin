import { CreateUserActionDs } from '../application/data-sctructures/create-user-action.ds';
import { CreatedUserActionDs } from '../application/data-sctructures/created-user-action.ds';

export interface ICreateUserAction {
  execute(actionData: CreateUserActionDs): Promise<CreatedUserActionDs>;
}

export interface ICheckUsersLogsAndUpdateActionsUseCase {
  execute(): Promise<void>;
}

export interface ICheckUsersActionsAndMailingUsers {
  execute(): Promise<Array<string>>;
}
