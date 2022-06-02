import { AccessLevelEnum } from '../../../enums';
import { ITablePermissionData } from '../../permission/permission.interface';

export interface IUserAccessRepository {
  getUserConnectionAccessLevel(cognitoUserName: string, connectionId: string): Promise<AccessLevelEnum>;

  checkUserConnectionRead(cognitoUserName: string, connectionId: string): Promise<boolean>;

  checkUserConnectionEdit(cognitoUserName: string, connectionId: string): Promise<boolean>;

  getGroupAccessLevel(cognitoUserName: string, groupId: string): Promise<AccessLevelEnum>;

  checkUserGroupRead(cognitoUserName: string, groupId: string): Promise<boolean>;

  checkUserGroupEdit(cognitoUserName: string, groupId: string): Promise<boolean>;

  getUserTablePermissions(
    cognitoUserName: string,
    connectionId: string,
    tableName: string,
    masterPwd: string,
  ): Promise<ITablePermissionData>;

  getUserPermissionsForAvailableTables(
    cognitoUserName: string,
    connectionId: string,
    tableNames: Array<string>,
  ): Promise<Array<ITablePermissionData>>;

  checkTableRead(cognitoUserName: string, connectionId: string, tableName: string, masterPwd: string): Promise<boolean>;

  checkTableAdd(cognitoUserName: string, connectionId: string, tableName: string, masterPwd: string): Promise<boolean>;

  checkTableDelete(
    cognitoUserName: string,
    connectionId: string,
    tableName: string,
    masterPwd: string,
  ): Promise<boolean>;

  checkTableEdit(cognitoUserName: string, connectionId: string, tableName: string, masterPwd: string): Promise<boolean>;
}
