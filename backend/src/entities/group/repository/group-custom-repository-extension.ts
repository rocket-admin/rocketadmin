import { ConnectionEntity } from '../../connection/connection.entity.js';
import { UserEntity } from '../../user/user.entity.js';
import { GroupEntity } from '../group.entity.js';
import { IGroupRepository } from './group.repository.interface.js';

export const groupCustomRepositoryExtension: IGroupRepository = {
	async saveNewOrUpdatedGroup(groupData: GroupEntity): Promise<GroupEntity> {
		return await this.save(groupData);
	},

	async findAllGroupsInConnection(connectionId: string): Promise<Array<GroupEntity>> {
		const qb = this.createQueryBuilder('group')
			.leftJoinAndSelect('group.connection', 'connection')
			.andWhere('connection.id = :id', { id: connectionId });
		return await qb.getMany();
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

	async findAllUserGroupsInConnection(connectionId: string, cognitoUserName: string): Promise<Array<GroupEntity>> {
		const qb = this.createQueryBuilder('group')
			.leftJoinAndSelect('group.connection', 'connection')
			.leftJoinAndSelect('group.users', 'user')
			.andWhere('connection.id = :connectionId', { connectionId: connectionId })
			.andWhere('user.id = :cognitoUserName', { cognitoUserName: cognitoUserName });
		return await qb.getMany();
	},

	async findGroupByIdWithConnectionAndUsers(groupId: string): Promise<GroupEntity> {
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
		const qb = this.createQueryBuilder('group').andWhere('group.id = :id', { id: groupId });
		return await qb.getOne();
	},

	async findAllUsersInGroupsWhereUserIsAdmin(userId: string, connectionId: string): Promise<Array<UserEntity>> {
		// Find groups where the user is a member, in the given connection,
		// and the Cedar policy grants group:edit access (wildcard or explicit)
		const adminGroupIds: Array<{ id: string }> = await this.createQueryBuilder('group')
			.select('group.id', 'id')
			.leftJoin('group.connection', 'connection')
			.leftJoin('group.users', 'user')
			.where('user.id = :userId', { userId })
			.andWhere('connection.id = :connectionId', { connectionId })
			.andWhere(
				'(group.isMain = true OR group.cedarPolicy LIKE :wildcardPattern OR group.cedarPolicy LIKE :groupEditPattern)',
				{
					wildcardPattern: '%principal, action, resource%',
					groupEditPattern: '%group:edit%',
				},
			)
			.getRawMany();

		if (adminGroupIds.length === 0) {
			return [];
		}

		const groupIds = adminGroupIds.map((g) => g.id);
		return await this.manager
			.getRepository(UserEntity)
			.createQueryBuilder('user')
			.leftJoin('user.groups', 'group')
			.where('group.id IN (:...groupIds)', { groupIds })
			.getMany();
	},
};
