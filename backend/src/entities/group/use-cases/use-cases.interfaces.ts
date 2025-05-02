import { InTransactionEnum } from '../../../enums/index.js';
import { FoundUserInGroupDs } from '../../user/application/data-structures/found-user-in-group.ds.js';
import { AddUserInGroupDs, AddUserInGroupWithSaaSDs } from '../application/data-sctructures/add-user-in-group.ds.js';
import { AddedUserInGroupDs } from '../application/data-sctructures/added-user-in-group.ds.js';
import { DeletedGroupResultDs } from '../application/data-sctructures/deleted-group-result.ds.js';
import { FoundGroupDataInfoDs, FoundUserGroupsDs } from '../application/data-sctructures/found-user-groups.ds.js';
import { RemoveUserFromGroupResultDs } from '../application/data-sctructures/remove-user-from-group-result.ds.js';
import { UpdateGroupTitleDto } from '../dto/update-group-title.dto.js';

export interface IAddUserInGroup {
  execute(inputData: AddUserInGroupWithSaaSDs, inTransaction: InTransactionEnum): Promise<AddedUserInGroupDs>;
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

export interface IUpdateGroupTitle {
  execute(inputData: UpdateGroupTitleDto, inTransaction: InTransactionEnum): Promise<FoundGroupDataInfoDs>;
}
