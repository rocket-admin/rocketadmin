import { ConnectionEntity } from '../../connection/connection.entity.js';
import { UserEntity } from '../../user/user.entity.js';
import { GroupEntity } from '../group.entity.js';

export interface IGroupRepository {
  saveNewOrUpdatedGroup(groupData: GroupEntity): Promise<GroupEntity>;

  findAllGroupsInConnection(connectionId: string): Promise<Array<GroupEntity>>;

  createdAdminGroupInConnection(connection: ConnectionEntity, user: UserEntity): Promise<GroupEntity>;

  findGroupInConnection(groupId: string, connectionId: string): Promise<GroupEntity>;

  removeGroupEntity(group: GroupEntity): Promise<GroupEntity>;

  findAllUserGroupsInConnection(connectionId: string, cognitoUserName: string): Promise<Array<GroupEntity>>;

  findGroupByIdWithConnectionAndUsers(groupId: string): Promise<GroupEntity>;

  findAllUserGroups(userId: string): Promise<Array<GroupEntity>>;

  findAllUsersInGroup(groupId: string): Promise<Array<UserEntity>>;

  findGroupWithPermissionsById(groupId: string): Promise<GroupEntity>;

  findAllUsersInGroupsWhereUserIsAdmin(userId: string, connectionId: string): Promise<Array<UserEntity>>;
}
