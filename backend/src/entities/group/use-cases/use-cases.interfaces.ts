import { InTransactionEnum } from '../../../enums';
import { FoundUserInGroupDs } from '../../user/application/data-structures/found-user-in-group.ds';
import { IToken } from '../../user/utils/generate-gwt-token';
import { AddUserInGroupDs } from '../application/data-sctructures/add-user-in-group.ds';
import { AddedUserInGroupDs } from '../application/data-sctructures/added-user-in-group.ds';
import { DeletedGroupResultDs } from '../application/data-sctructures/deleted-group-result.ds';
import { FoundUserGroupsDs } from '../application/data-sctructures/found-user-groups.ds';
import { RemoveUserFromGroupResultDs } from '../application/data-sctructures/remove-user-from-group-result.ds';
import { VerifyAddUserInGroupDs } from '../application/data-sctructures/verify-add-user-in-group.ds';

export interface IAddUserInGroup {
  execute(inputData: AddUserInGroupDs, inTransaction: InTransactionEnum): Promise<AddedUserInGroupDs>;
}

export interface IVerifyAddUserInGroup {
  execute(inputData: VerifyAddUserInGroupDs, inTransaction: InTransactionEnum): Promise<IToken>;
}

export interface IFindUserGroups {
  execute(inputData: string, inTransaction: InTransactionEnum): Promise<FoundUserGroupsDs>;
}

export interface IFindAllUsersInGroup {
  execute(inputData: string, inTransaction: InTransactionEnum): Promise<Array<FoundUserInGroupDs>>;
}

export interface IRemoveUserFromGroup {
  execute(inputData: AddUserInGroupDs, inTransaction: InTransactionEnum): Promise<RemoveUserFromGroupResultDs>;
}

export interface IDeleteGroup {
  execute(groupId: string, inTransaction: InTransactionEnum): Promise<DeletedGroupResultDs>;
}
