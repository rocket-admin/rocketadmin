import { ConnectionEntity } from '../../connection/connection.entity';
import { EntityRepository, getRepository, Repository } from 'typeorm';
import { GroupEntity } from '../group.entity';
import { IGroupRepository } from './group.repository.interface';
import { UserEntity } from '../../user/user.entity';
import { AccessLevelEnum, PermissionTypeEnum } from '../../../enums';

@EntityRepository(GroupEntity)
export class GroupRepository extends Repository<GroupEntity> implements IGroupRepository {
  constructor() {
    super();
  }

  public async saveNewOrUpdatedGroup(groupData: GroupEntity): Promise<GroupEntity> {
    return await this.save(groupData);
  }

  public async findAllGroupsInConnection(connectionId: string): Promise<Array<Omit<GroupEntity, 'connection'>>> {
    const qb = await getRepository(GroupEntity)
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.connection', 'connection');
    qb.andWhere('connection.id = :id', { id: connectionId });
    const groups = await qb.getMany();
    groups.map((e) => {
      delete e.connection;
    });
    return groups;
  }

  public async createdAdminGroupInConnection(connection: ConnectionEntity, user: UserEntity): Promise<GroupEntity> {
    const newGroup = new GroupEntity();
    newGroup.connection = connection;
    newGroup.users = [user];
    newGroup.isMain = true;
    newGroup.title = 'Admin';
    return await this.save(newGroup);
  }

  public async findGroupInConnection(groupId: string, connectionId: string): Promise<GroupEntity> {
    const qb = await getRepository(GroupEntity)
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.connection', 'connection')
      .andWhere('group.id = :groupId', { groupId: groupId })
      .andWhere('connection.id = :connectionId', { connectionId: connectionId });
    return await qb.getOne();
  }

  public async removeGroupEntity(group: GroupEntity): Promise<GroupEntity> {
    return await this.remove(group);
  }

  public async findAllUserGroupsInConnection(
    connectionId: string,
    cognitoUserName: string,
  ): Promise<Array<Omit<GroupEntity, 'connection' | 'users'>>> {
    const qb = await getRepository(GroupEntity)
      .createQueryBuilder('group')
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
  }

  public async findGroupById(groupId: string): Promise<GroupEntity> {
    const qb = await getRepository(GroupEntity)
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.connection', 'connection')
      .leftJoinAndSelect('group.users', 'user')
      .andWhere('group.id = :groupId', { groupId: groupId });
    return await qb.getOne();
  }

  public async findAllUserGroups(userId: string): Promise<Array<GroupEntity>> {
    const qb = await getRepository(GroupEntity)
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.users', 'user')
      .andWhere('user.id = :userId', { userId: userId });
    return await qb.getMany();
  }

  public async findAllUsersInGroup(groupId: string): Promise<Array<UserEntity>> {
    const qb = await getRepository(UserEntity)
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.groups', 'group')
      .andWhere('group.id = :id', { id: groupId });
    return await qb.getMany();
  }

  public async findGroupWithPermissionsById(groupId: string): Promise<GroupEntity> {
    return await this.findOne({
      where: { id: groupId },
      relations: ['permissions'],
    });
  }

  public async findAllUsersInGroupsWhereUserIsAdmin(userId: string, connectionId: string): Promise<Array<UserEntity>> {
    const userQb = await getRepository(UserEntity)
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
  }
}
