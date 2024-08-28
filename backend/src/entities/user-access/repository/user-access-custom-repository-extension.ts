import { HttpException, HttpStatus } from '@nestjs/common';
import { AccessLevelEnum, PermissionTypeEnum } from '../../../enums/index.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { PermissionEntity } from '../../permission/permission.entity.js';
import { ITablePermissionData } from '../../permission/permission.interface.js';
import { IUserAccessRepository } from './user-access.repository.interface.js';
import { Cacher } from '../../../helpers/cache/cacher.js';
import { UserEntity } from '../../user/user.entity.js';

export const userAccessCustomReposiotoryExtension: IUserAccessRepository = {
  async getUserConnectionAccessLevel(cognitoUserName: string, connectionId: string): Promise<AccessLevelEnum> {
    const qb = this.createQueryBuilder('permission')
      .leftJoin('permission.groups', 'group')
      .leftJoin('group.users', 'user')
      .leftJoin('group.connection', 'connection')
      .where(
        'connection.id = :connectionId AND user.id = :cognitoUserName AND user.suspended = :isSuspended AND permission.type = :permissionType',
        {
          connectionId,
          cognitoUserName,
          isSuspended: false,
          permissionType: PermissionTypeEnum.Connection,
        },
      );

    const resultPermissions = await qb.getMany();

    if (resultPermissions.length === 0) {
      const isUserSuspended = !!(await this.manager
        .getRepository(UserEntity)
        .createQueryBuilder('user')
        .where('user.id = :cognitoUserName AND user.suspended = :isSuspended', {
          cognitoUserName,
          isSuspended: true,
        })
        .getCount());

      if (isUserSuspended) {
        throw new HttpException(
          {
            message: Messages.ACCOUNT_SUSPENDED,
          },
          HttpStatus.FORBIDDEN,
        );
      }
      return AccessLevelEnum.none;
    }

    for (const permission of resultPermissions) {
      if (permission.accessLevel === AccessLevelEnum.edit) {
        return AccessLevelEnum.edit;
      }
    }

    for (const permission of resultPermissions) {
      if (permission.accessLevel === AccessLevelEnum.readonly) {
        return AccessLevelEnum.readonly;
      }
    }
    return AccessLevelEnum.none;
  },

  async checkUserConnectionRead(cognitoUserName: string, connectionId: string): Promise<boolean> {
    const connectionAccessLevel = await this.getUserConnectionAccessLevel(cognitoUserName, connectionId);
    return connectionAccessLevel === AccessLevelEnum.edit || connectionAccessLevel === AccessLevelEnum.readonly;
  },

  async checkUserConnectionEdit(cognitoUserName: string, connectionId: string): Promise<boolean> {
    const connectionAccessLevel = await this.getUserConnectionAccessLevel(cognitoUserName, connectionId);
    return connectionAccessLevel === AccessLevelEnum.edit;
  },

  async getGroupAccessLevel(cognitoUserName: string, groupId: string): Promise<AccessLevelEnum> {
    const connectionId = await this.getConnectionId(groupId);

    const connectionEdit = !!(await this.createQueryBuilder('permission')
      .leftJoin('permission.groups', 'group')
      .leftJoin('group.users', 'user')
      .leftJoin('group.connection', 'connection')
      .where(
        'connection.id = :connectionId AND user.id = :cognitoUserName AND user.suspended = :isSuspended AND permission.type = :permissionType AND permission.accessLevel = :accessLevel',
        {
          connectionId,
          cognitoUserName,
          isSuspended: false,
          permissionType: PermissionTypeEnum.Connection,
          accessLevel: AccessLevelEnum.edit,
        },
      )
      .getCount());

    if (connectionEdit) {
      return AccessLevelEnum.edit;
    }
    const qb = this.createQueryBuilder('permission')
      .leftJoin('permission.groups', 'group')
      .leftJoin('group.users', 'user')
      .leftJoin('group.connection', 'connection')
      .where(
        'connection.id = :connectionId AND user.id = :cognitoUserName AND user.suspended = :isSuspended AND permission.type = :permissionType AND group.id = :groupId',
        {
          connectionId,
          cognitoUserName,
          isSuspended: false,
          permissionType: PermissionTypeEnum.Group,
          groupId,
        },
      );

    const resultPermissions = await qb.getMany();

    if (resultPermissions.length === 0) {
      const isUserSuspended = !!(await this.manager
        .getRepository(UserEntity)
        .createQueryBuilder('user')
        .where('user.id = :cognitoUserName AND user.suspended = :isSuspended', {
          cognitoUserName,
          isSuspended: true,
        })
        .getCount());

      if (isUserSuspended) {
        throw new HttpException(
          {
            message: Messages.ACCOUNT_SUSPENDED,
          },
          HttpStatus.FORBIDDEN,
        );
      }
      return AccessLevelEnum.none;
    }

    const connectionAccessLevels = resultPermissions.map((permission: PermissionEntity) => {
      return permission.accessLevel.toLowerCase();
    });

    if (connectionAccessLevels.includes(AccessLevelEnum.edit)) {
      return AccessLevelEnum.edit;
    }

    if (connectionAccessLevels.includes(AccessLevelEnum.readonly)) {
      return AccessLevelEnum.readonly;
    }

    return AccessLevelEnum.none;
  },

  async checkUserGroupRead(cognitoUserName: string, groupId: string): Promise<boolean> {
    const userGroupAccessLevel = await this.getGroupAccessLevel(cognitoUserName, groupId);
    return userGroupAccessLevel === AccessLevelEnum.edit || userGroupAccessLevel === AccessLevelEnum.readonly;
  },

  async checkUserGroupEdit(cognitoUserName: string, groupId: string): Promise<boolean> {
    const userGroupAccessLevel = await this.getGroupAccessLevel(cognitoUserName, groupId);
    return userGroupAccessLevel === AccessLevelEnum.edit;
  },

  async getUserTablePermissions(
    cognitoUserName: string,
    connectionId: string,
    tableName: string,
    _masterPwd: string,
  ): Promise<ITablePermissionData> {
    const connectionEdit = !!(await this.createQueryBuilder('permission')
      .leftJoin('permission.groups', 'group')
      .leftJoin('group.users', 'user')
      .leftJoin('group.connection', 'connection')
      .where(
        'connection.id = :connectionId AND user.id = :cognitoUserName AND user.suspended = :isSuspended AND permission.type = :permissionType AND permission.accessLevel = :accessLevel',
        {
          connectionId,
          cognitoUserName,
          isSuspended: false,
          permissionType: PermissionTypeEnum.Connection,
          accessLevel: AccessLevelEnum.edit,
        },
      )
      .getCount());

    if (connectionEdit) {
      return {
        tableName: tableName,
        accessLevel: {
          visibility: true,
          readonly: false,
          add: true,
          delete: true,
          edit: true,
        },
      };
    }

    const qb = this.createQueryBuilder('permission')
      .leftJoin('permission.groups', 'group')
      .leftJoin('group.users', 'user')
      .leftJoin('group.connection', 'connection')
      .where(
        'connection.id = :connectionId AND user.id = :cognitoUserName AND user.suspended = :isSuspended AND permission.type = :permissionType AND permission.tableName = :tableName',
        {
          connectionId,
          cognitoUserName,
          isSuspended: false,
          permissionType: PermissionTypeEnum.Table,
          tableName,
        },
      );

    const resultPermissions: Array<PermissionEntity> = await qb.getMany();

    if (resultPermissions.length === 0) {
      const isUserSuspended = !!(await this.manager
        .getRepository(UserEntity)
        .createQueryBuilder('user')
        .where('user.id = :cognitoUserName AND user.suspended = :isSuspended', {
          cognitoUserName,
          isSuspended: true,
        })
        .getCount());

      if (isUserSuspended) {
        throw new HttpException(
          {
            message: Messages.ACCOUNT_SUSPENDED,
          },
          HttpStatus.FORBIDDEN,
        );
      }
    }

    const accessLevels = {
      visibility: false,
      readonly: false,
      add: false,
      delete: false,
      edit: false,
    };

    for (const permission of resultPermissions) {
      switch (permission.accessLevel) {
        case AccessLevelEnum.visibility:
          accessLevels.visibility = true;
          break;
        case AccessLevelEnum.readonly:
          accessLevels.readonly = true;
          break;
        case AccessLevelEnum.add:
          accessLevels.add = true;
          break;
        case AccessLevelEnum.delete:
          accessLevels.delete = true;
          break;
        case AccessLevelEnum.edit:
          accessLevels.edit = true;
          break;
      }
    }

    return {
      tableName: tableName,
      accessLevel: accessLevels,
    };
  },

  async getUserPermissionsForAvailableTables(
    cognitoUserName: string,
    connectionId: string,
    tableNames: Array<string>,
  ): Promise<Array<ITablePermissionData>> {
    const connectionEdit = !!(await this.createQueryBuilder('permission')
      .leftJoin('permission.groups', 'group')
      .leftJoin('group.users', 'user')
      .leftJoin('group.connection', 'connection')
      .where(
        'connection.id = :connectionId AND user.id = :cognitoUserName AND permission.type = :permissionType AND permission.accessLevel = :accessLevel',
        {
          connectionId,
          cognitoUserName,
          permissionType: PermissionTypeEnum.Connection,
          accessLevel: AccessLevelEnum.edit,
        },
      )
      .getCount());

    const tablesWithPermissionsArr = [];
    if (connectionEdit) {
      for (const tableName of tableNames) {
        tablesWithPermissionsArr.push({
          tableName: tableName,
          accessLevel: {
            visibility: true,
            readonly: false,
            add: true,
            delete: true,
            edit: true,
          },
        });
      }
      return tablesWithPermissionsArr;
    }

    const qb = this.createQueryBuilder('permission')
      .leftJoin('permission.groups', 'group')
      .leftJoin('group.users', 'user')
      .leftJoin('group.connection', 'connection')
      .where(
        'connection.id = :connectionId AND user.id = :cognitoUserName AND user.suspended = :isSuspended AND permission.type = :permissionType',
        {
          connectionId,
          cognitoUserName,
          isSuspended: false,
          permissionType: PermissionTypeEnum.Table,
        },
      );

    const allTablePermissions: Array<PermissionEntity> = await qb.getMany();

    if (allTablePermissions.length === 0) {
      const isUserSuspended = !!(await this.manager
        .getRepository(UserEntity)
        .createQueryBuilder('user')
        .where('user.id = :cognitoUserName AND user.suspended = :isSuspended', {
          cognitoUserName,
          isSuspended: true,
        })
        .getCount());

      if (isUserSuspended) {
        throw new HttpException(
          {
            message: Messages.ACCOUNT_SUSPENDED,
          },
          HttpStatus.FORBIDDEN,
        );
      }
    }

    const tablesAndAccessLevels = new Map<string, Set<AccessLevelEnum>>();

    for (const tableName of tableNames) {
      if (tableName !== '__proto__') {
        tablesAndAccessLevels.set(tableName, new Set<AccessLevelEnum>());
      }
    }

    for (const permission of allTablePermissions) {
      const { tableName, accessLevel } = permission;
      if (tablesAndAccessLevels.has(tableName)) {
        tablesAndAccessLevels.get(tableName)!.add(accessLevel as AccessLevelEnum);
      }
    }

    for (const [tableName, accessLevels] of tablesAndAccessLevels) {
      const accessLevelObj = {
        visibility: accessLevels.has(AccessLevelEnum.visibility),
        readonly: accessLevels.has(AccessLevelEnum.readonly),
        add: accessLevels.has(AccessLevelEnum.add),
        delete: accessLevels.has(AccessLevelEnum.delete),
        edit: accessLevels.has(AccessLevelEnum.edit),
      };

      tablesWithPermissionsArr.push({
        tableName,
        accessLevel: accessLevelObj,
      });
    }

    return tablesWithPermissionsArr.filter((tableWithPermission: ITablePermissionData) => {
      return tableWithPermission.accessLevel.visibility;
    });
  },

  async checkTableRead(
    cognitoUserName: string,
    connectionId: string,
    tableName: string,
    masterPwd: string,
  ): Promise<boolean> {
    const { accessLevel } = await this.getUserTablePermissions(cognitoUserName, connectionId, tableName, masterPwd);
    return accessLevel.visibility || accessLevel.add || accessLevel.delete || accessLevel.edit;
  },

  async checkTableAdd(
    cognitoUserName: string,
    connectionId: string,
    tableName: string,
    masterPwd: string,
  ): Promise<boolean> {
    const { accessLevel } = await this.getUserTablePermissions(cognitoUserName, connectionId, tableName, masterPwd);
    return accessLevel.visibility && accessLevel.add;
  },

  async checkTableDelete(
    cognitoUserName: string,
    connectionId: string,
    tableName: string,
    masterPwd: string,
  ): Promise<boolean> {
    const { accessLevel } = await this.getUserTablePermissions(cognitoUserName, connectionId, tableName, masterPwd);
    return accessLevel.visibility && accessLevel.delete;
  },

  async checkTableEdit(
    cognitoUserName: string,
    connectionId: string,
    tableName: string,
    masterPwd: string,
  ): Promise<boolean> {
    const { accessLevel } = await this.getUserTablePermissions(cognitoUserName, connectionId, tableName, masterPwd);
    return accessLevel.visibility && accessLevel.edit;
  },

  async getConnectionId(groupId: string): Promise<string> {
    const connectionRepository = this.manager.getRepository(ConnectionEntity);
    const connection = await connectionRepository
      .createQueryBuilder('connection')
      .leftJoin('connection.groups', 'group')
      .where('group.id = :id', { id: groupId })
      .getOne();

    if (!connection) {
      throw new HttpException({ message: Messages.CONNECTION_NOT_FOUND }, HttpStatus.BAD_REQUEST);
    }

    return connection.id;
  },

  async improvedCheckTableRead(userId: string, connectionId: string, tableName: string): Promise<boolean> {
    const cachedReadPermission: boolean | null = Cacher.getUserTableReadPermissionCache(
      userId,
      connectionId,
      tableName,
    );
    if (cachedReadPermission !== null) {
      return cachedReadPermission;
    }

    const qb = this.createQueryBuilder('permission')
      .leftJoin('permission.groups', 'group')
      .leftJoin('group.users', 'user')
      .leftJoin('group.connection', 'connection')
      .where('connection.id = :connectionId AND user.id = :userId AND user.suspended = :isSuspended', {
        connectionId,
        userId,
        isSuspended: false,
      });

    const allUserPermissions: Array<PermissionEntity> = await qb.getMany();

    if (allUserPermissions.length === 0) {
      Cacher.setUserTableReadPermissionCache(userId, connectionId, tableName, false);
      return false;
    }

    for (const permission of allUserPermissions) {
      if (
        (permission.type === PermissionTypeEnum.Connection && permission.accessLevel === AccessLevelEnum.edit) ||
        (permission.type === PermissionTypeEnum.Table &&
          permission.tableName === tableName &&
          [AccessLevelEnum.visibility, AccessLevelEnum.add, AccessLevelEnum.delete, AccessLevelEnum.edit].includes(
            permission.accessLevel as AccessLevelEnum,
          ))
      ) {
        Cacher.setUserTableReadPermissionCache(userId, connectionId, tableName, true);
        return true;
      }
    }

    Cacher.setUserTableReadPermissionCache(userId, connectionId, tableName, false);
    return false;
  },
};
