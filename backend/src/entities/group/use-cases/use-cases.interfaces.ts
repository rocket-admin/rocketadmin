import { AddUserInGroupDs } from '../application/data-sctructures/add-user-in-group.ds';
import { VerifyAddUserInGroupDs } from '../application/data-sctructures/verify-add-user-in-group.ds';
import { AddedUserInGroupDs } from '../application/data-sctructures/added-user-in-group.ds';
import { FoundUserGroupsDs } from '../application/data-sctructures/found-user-groups.ds';
import { IToken } from '../../user/utils/generate-gwt-token';
import { FoundUserInGroupDs } from '../../user/application/data-structures/found-user-in-group.ds';
import { RemoveUserFromGroupResultDs } from '../application/data-sctructures/remove-user-from-group-result.ds';
import { DeleteResult } from 'typeorm';
import { DeletedGroupResultDs } from '../application/data-sctructures/deleted-group-result.ds';

export interface IAddUserInGroup {
  execute(inputData: AddUserInGroupDs): Promise<AddedUserInGroupDs>;
}

export interface IVerifyAddUserInGroup {
  execute(inputData: VerifyAddUserInGroupDs): Promise<IToken>;
}

export interface IFindUserGroups {
  execute(inputData: string): Promise<FoundUserGroupsDs>;
}

export interface IFindAllUsersInGroup {
  execute(inputData: string): Promise<Array<FoundUserInGroupDs>>;
}

export interface IRemoveUserFromGroup {
  execute(inputData: AddUserInGroupDs): Promise<RemoveUserFromGroupResultDs>;
}

export interface IDeleteGroup {
  execute(groupId: string): Promise<DeletedGroupResultDs>;
}
