
import { AccessLevelEnum } from '../../../enums/access-level.enum.js';
import { PermissionTypeEnum } from '../../../enums/permission-type.enum.js';
import { GroupEntity } from '../../group/group.entity.js';
import { TablePermissionDs } from '../application/data-structures/create-permissions.ds.js';
import { PermissionEntity } from '../permission.entity.js';

export const permissionCustomRepositoryExtension = {
  async saveNewOrUpdatedPermission(permissionData: PermissionEntity): Promise<PermissionEntity> {
    return await this.save(permissionData);
  },

  async createdDefaultAdminPermissionsInGroup(group: GroupEntity): Promise<Array<PermissionEntity>> {
    const connectionAdminPermission = new PermissionEntity();
    connectionAdminPermission.groups = [group];
    connectionAdminPermission.type = PermissionTypeEnum.Connection;
    connectionAdminPermission.accessLevel = AccessLevelEnum.edit;
    const createdConnectionAdminPermission = await this.save(connectionAdminPermission);
    const groupAdminPermission = new PermissionEntity();
    groupAdminPermission.groups = [group];
    groupAdminPermission.type = PermissionTypeEnum.Group;
    groupAdminPermission.accessLevel = AccessLevelEnum.edit;
    const createdGroupAdminPermission = await this.save(groupAdminPermission);
    return [createdConnectionAdminPermission, createdGroupAdminPermission];
  },

  async getGroupPermissionForConnection(connectionId: string, groupId: string): Promise<AccessLevelEnum> {
    const connectionQb = this.createQueryBuilder('permission')
      .leftJoinAndSelect('permission.groups', 'group')
      .leftJoinAndSelect('group.connection', 'connection')
      .andWhere('connection.id = :connectionId', { connectionId: connectionId })
      .andWhere('group.id = :groupId', { groupId: groupId })
      .andWhere('permission.type = :permissionType', {
        permissionType: PermissionTypeEnum.Connection,
      });
    const connectionPermission: PermissionEntity = await connectionQb.getOne();
    let connectionAccessLevel: AccessLevelEnum = AccessLevelEnum.none;
    if (connectionPermission) {
      switch (connectionPermission.accessLevel.toLowerCase()) {
        case AccessLevelEnum.edit:
        case AccessLevelEnum.fullaccess:
          connectionAccessLevel = AccessLevelEnum.edit;
          break;
        case AccessLevelEnum.readonly:
          connectionAccessLevel = AccessLevelEnum.readonly;
          break;
        default:
          break;
      }
    }
    return connectionAccessLevel;
  },

  async getGroupPermissionsForGroup(connectionId: string, groupId: string): Promise<AccessLevelEnum> {
    const groupQb = this.createQueryBuilder('permission')
      .leftJoinAndSelect('permission.groups', 'group')
      .leftJoinAndSelect('group.connection', 'connection')
      .andWhere('connection.id = :connectionId', { connectionId: connectionId })
      .andWhere('group.id = :groupId', { groupId: groupId })
      .andWhere('permission.type = :permissionType', {
        permissionType: PermissionTypeEnum.Group,
      });
    const groupPermission: PermissionEntity = await groupQb.getOne();
    let groupAccessLevel: AccessLevelEnum = AccessLevelEnum.none;
    if (groupPermission) {
      switch (groupPermission.accessLevel.toLowerCase()) {
        case AccessLevelEnum.edit:
        case AccessLevelEnum.fullaccess:
          groupAccessLevel = AccessLevelEnum.edit;
          break;
        case AccessLevelEnum.readonly:
          groupAccessLevel = AccessLevelEnum.readonly;
          break;
        default:
          break;
      }
    }
    return groupAccessLevel;
  },

  async getGroupPermissionsForTable(
    connectionId: string,
    groupId: string,
    tableName: string,
  ): Promise<TablePermissionDs> {
    const tableQb = this.createQueryBuilder('permission')
      .leftJoinAndSelect('permission.groups', 'group')
      .leftJoinAndSelect('group.connection', 'connection')
      .andWhere('connection.id = :connectionId', { connectionId: connectionId })
      .andWhere('group.id = :groupId', { groupId: groupId })
      .andWhere('permission.type = :permissionType', {
        permissionType: PermissionTypeEnum.Table,
      })
      .andWhere('permission.tableName = :tableName', { tableName: tableName });
    const tablePermissions: Array<PermissionEntity> = await tableQb.getMany();
    return {
      tableName: tableName,
      accessLevel: {
        add: !!tablePermissions.find((el) => el.accessLevel === AccessLevelEnum.add),
        delete: !!tablePermissions.find((el) => el.accessLevel === AccessLevelEnum.delete),
        edit: !!tablePermissions.find((el) => el.accessLevel === AccessLevelEnum.edit),
        readonly: !!tablePermissions.find((el) => el.accessLevel === AccessLevelEnum.readonly),
        visibility: !!tablePermissions.find((el) => el.accessLevel === AccessLevelEnum.visibility),
      },
    };
  },

  async getGroupPermissionsForAllTables(connectionId: string, groupId: string): Promise<Array<PermissionEntity>> {
    const tableQb = this.createQueryBuilder('permission')
      .leftJoinAndSelect('permission.groups', 'group')
      .leftJoinAndSelect('group.connection', 'connection')
      .andWhere('connection.id = :connectionId', { connectionId: connectionId })
      .andWhere('group.id = :groupId', { groupId: groupId })
      .andWhere('permission.type = :permissionType', {
        permissionType: PermissionTypeEnum.Table,
      });
    return await tableQb.getMany();
  },

  async getPermissionEntityForConnection(connectionId: string, groupId: string): Promise<PermissionEntity> {
    const connectionQb = this.createQueryBuilder('permission')
      .leftJoinAndSelect('permission.groups', 'group')
      .leftJoinAndSelect('group.connection', 'connection')
      .andWhere('connection.id = :connectionId', { connectionId: connectionId })
      .andWhere('group.id = :groupId', { groupId: groupId })
      .andWhere('permission.type = :permissionType', {
        permissionType: PermissionTypeEnum.Connection,
      });
    return await connectionQb.getOne();
  },

  async getPermissionEntityForGroup(connectionId: string, groupId: string): Promise<PermissionEntity> {
    const groupQb = this.createQueryBuilder('permission')
      .leftJoinAndSelect('permission.groups', 'group')
      .leftJoinAndSelect('group.connection', 'connection')
      .andWhere('connection.id = :connectionId', { connectionId: connectionId })
      .andWhere('group.id = :groupId', { groupId: groupId })
      .andWhere('permission.type = :permissionType', {
        permissionType: PermissionTypeEnum.Group,
      });
    return await groupQb.getOne();
  },

  async getAllUserPermissionsForAllTablesInConnection(
    userId: string,
    connectionId: string,
  ): Promise<Array<PermissionEntity>> {
    const qb = this.createQueryBuilder('permission')
      .leftJoinAndSelect('permission.groups', 'group')
      .leftJoinAndSelect('group.users', 'user')
      .leftJoinAndSelect('group.connection', 'connection')
      .andWhere('connection.id = :connectionId', { connectionId: connectionId })
      .andWhere('user.id = :userId', { userId: userId })
      .andWhere('permission.type = :permissionType', { permissionType: PermissionTypeEnum.Table });
    return await qb.getMany();
  },

  async removePermissionEntity(permission: PermissionEntity): Promise<PermissionEntity> {
    return await this.remove(permission);
  },
};
