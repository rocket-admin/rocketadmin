import { GroupEntity } from '../group.entity';
import { ConnectionEntity } from '../../connection/connection.entity';
import { UserEntity } from '../../user/user.entity';

export interface IGroupRepository {
  saveNewOrUpdatedGroup(groupData: GroupEntity): Promise<GroupEntity>;

  findAllGroupsInConnection(connectionId: string): Promise<Array<Omit<GroupEntity, 'connection'>>>;

  createdAdminGroupInConnection(connection: ConnectionEntity, user: UserEntity): Promise<GroupEntity>;

  findGroupInConnection(groupId: string, connectionId: string): Promise<GroupEntity>;

  removeGroupEntity(group: GroupEntity): Promise<GroupEntity>;

  findAllUserGroupsInConnection(
    connectionId: string,
    cognitoUserName: string,
  ): Promise<Array<Omit<GroupEntity, 'connection' | 'users'>>>;

  findGroupById(groupId: string): Promise<GroupEntity>;

  findAllUserGroups(userId: string): Promise<Array<GroupEntity>>;

  findAllUsersInGroup(groupId: string): Promise<Array<UserEntity>>;

  findGroupWithPermissionsById(groupId: string): Promise<GroupEntity>;

  findAllUsersInGroupsWhereUserIsAdmin(userId: string, connectionId: string): Promise<Array<UserEntity>>;
}
