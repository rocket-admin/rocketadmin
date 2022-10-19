import { AccessLevelEnum, PermissionTypeEnum } from '../../../enums';
import { ConnectionEntity } from '../../connection/connection.entity';
import { UserEntity } from '../../user/user.entity';
import { GroupEntity } from '../group.entity';

export const groupCustomRepositoryExtension = {
  async saveNewOrUpdatedGroup(groupData: GroupEntity): Promise<GroupEntity> {
    return await this.save(groupData);
  },

  async findAllGroupsInConnection(connectionId: string): Promise<Array<Omit<GroupEntity, 'connection'>>> {
    const qb = this.createQueryBuilder('group').leftJoinAndSelect('group.connection', 'connection');
    qb.andWhere('connection.id = :id', { id: connectionId });
    const groups: Array<GroupEntity> = await qb.getMany();
    groups.map((e) => {
      delete e.connection;
    });
    return groups;
  },

  async createdAdminGroupInConnection(connection: ConnectionEntity, user: UserEntity): Promise<GroupEntity> {
    const newGroup = new GroupEntity();
    newGroup.connection = connection;
    newGroup.users = [user];
    newGroup.isMain = true;
    newGroup.title = 'Admin';
    return await this.save(newGroup);
  },

  async findGroupInConnection(groupId: string, connectionId: string): Promise<GroupEntity> {
    const qb = this.createQueryBuilder('group')
      .leftJoinAndSelect('group.connection', 'connection')
      .andWhere('group.id = :groupId', { groupId: groupId })
      .andWhere('connection.id = :connectionId', { connectionId: connectionId });
    return await qb.getOne();
  },

  async removeGroupEntity(group: GroupEntity): Promise<GroupEntity> {
    return await this.remove(group);
  },

  async findAllUserGroupsInConnection(
    connectionId: string,
    cognitoUserName: string,
  ): Promise<Array<Omit<GroupEntity, 'connection' | 'users'>>> {
    const qb = this.createQueryBuilder('group')
      .leftJoinAndSelect('group.connection', 'connection')
      .leftJoinAndSelect('group.users', 'user')
      .andWhere('connection.id = :connectionId', { connectionId: connectionId })
      .andWhere('user.id = :cognitoUserName', { cognitoUserName: cognitoUserName });
    const foundGroups = await qb.getMany();
    return foundGroups.map((group: GroupEntity) => {
      delete group.connection;
      delete group.users;
      return group;
    });
  },

  async findGroupById(groupId: string): Promise<GroupEntity> {
    const qb = this.createQueryBuilder('group')
      .leftJoinAndSelect('group.connection', 'connection')
      .leftJoinAndSelect('group.users', 'user')
      .andWhere('group.id = :groupId', { groupId: groupId });
    return await qb.getOne();
  },

  async findAllUserGroups(userId: string): Promise<Array<GroupEntity>> {
    const qb = this.createQueryBuilder('group')
      .leftJoinAndSelect('group.users', 'user')
      .andWhere('user.id = :userId', { userId: userId });
    return await qb.getMany();
  },

  async findAllUsersInGroup(groupId: string): Promise<Array<UserEntity>> {
    const qb = this.manager
      .getRepository(UserEntity)
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.groups', 'group')
      .andWhere('group.id = :id', { id: groupId });
    return await qb.getMany();
  },

  async findGroupWithPermissionsById(groupId: string): Promise<GroupEntity> {
    const qb = this.createQueryBuilder('group')
      .leftJoinAndSelect('group.permissions', 'permission')
      .andWhere('group.id = :id', { id: groupId });
    return await qb.getOne();
  },

  async findAllUsersInGroupsWhereUserIsAdmin(userId: string, connectionId: string): Promise<Array<UserEntity>> {
    const userQb = this.manager
      .getRepository(UserEntity)
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.groups', 'group')
      .leftJoinAndSelect('group.connection', 'connection')
      .leftJoinAndSelect('group.permissions', 'permission')
      .andWhere('user.id = :userId', { userId: userId })
      .andWhere('connection.id = :connectionId', { connectionId: connectionId })
      .andWhere('permission.type = :permissionType', {
        permissionType: PermissionTypeEnum.Group,
      })
      .andWhere('permission.accessLevel = :permissionAccessLevel', {
        permissionAccessLevel: AccessLevelEnum.edit,
      });
    return await userQb.getMany();
  },
};
