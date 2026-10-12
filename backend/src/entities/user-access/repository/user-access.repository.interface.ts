import { AccessLevelEnum } from '../../../enums/access-level.enum.js';
import { GroupEntity } from '../../group/group.entity.js';
import { ITablePermissionData } from '../../permission/permission.interface.js';

export interface IUserAccessRepository {
	getUserConnectionAccessLevel(cognitoUserName: string, connectionId: string): Promise<AccessLevelEnum>;

	checkUserConnectionRead(cognitoUserName: string, connectionId: string): Promise<boolean>;

	checkUserConnectionEdit(cognitoUserName: string, connectionId: string): Promise<boolean>;

	getGroupAccessLevel(cognitoUserName: string, groupId: string): Promise<AccessLevelEnum>;

	getGroupAccessLevels(userId: string, groups: Array<GroupEntity>): Promise<Map<string, AccessLevelEnum>>;

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

	getConnectionId(groupId: string): Promise<string>;

	improvedCheckTableRead(userId: string, connectionId: string, tableName: string, masterPwd?: string): Promise<boolean>;

	getReadableTables(userId: string, connectionId: string, tableNames: Array<string>): Promise<Set<string>>;
}
