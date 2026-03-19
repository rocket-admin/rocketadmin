import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AccessLevelEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { Cacher } from '../../helpers/cache/cacher.js';
import { IGlobalDatabaseContext } from '../../common/application/global-database-context.interface.js';
import { BaseType } from '../../common/data-injection.tokens.js';
import { GroupEntity } from '../group/group.entity.js';
import { ITablePermissionData } from '../permission/permission.interface.js';
import {
	CedarAction,
	CedarResourceType,
	CEDAR_ACTION_TYPE,
	CEDAR_USER_TYPE,
} from './cedar-action-map.js';
import { buildCedarEntities } from './cedar-entity-builder.js';
import { CEDAR_SCHEMA } from './cedar-schema.js';
import * as cedarWasm from '@cedar-policy/cedar-wasm/nodejs';
import { IUserAccessRepository } from '../user-access/repository/user-access.repository.interface.js';

@Injectable()
export class CedarPermissionsService implements IUserAccessRepository {
	private readonly schema: Record<string, unknown> = CEDAR_SCHEMA as Record<string, unknown>;

	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		private readonly globalDbContext: IGlobalDatabaseContext,
	) {}

	async getUserConnectionAccessLevel(cognitoUserName: string, connectionId: string): Promise<AccessLevelEnum> {
		await this.assertUserNotSuspended(cognitoUserName);
		const editAllowed = await this.evaluateAction(cognitoUserName, connectionId, CedarAction.ConnectionEdit);
		if (editAllowed) return AccessLevelEnum.edit;
		const readAllowed = await this.evaluateAction(cognitoUserName, connectionId, CedarAction.ConnectionRead);
		if (readAllowed) return AccessLevelEnum.readonly;
		return AccessLevelEnum.none;
	}

	async checkUserConnectionRead(cognitoUserName: string, connectionId: string): Promise<boolean> {
		const level = await this.getUserConnectionAccessLevel(cognitoUserName, connectionId);
		return level === AccessLevelEnum.edit || level === AccessLevelEnum.readonly;
	}

	async checkUserConnectionEdit(cognitoUserName: string, connectionId: string): Promise<boolean> {
		const level = await this.getUserConnectionAccessLevel(cognitoUserName, connectionId);
		return level === AccessLevelEnum.edit;
	}

	async getGroupAccessLevel(cognitoUserName: string, groupId: string): Promise<AccessLevelEnum> {
		await this.assertUserNotSuspended(cognitoUserName);
		const connectionId = await this.getConnectionId(groupId);
		const editAllowed = await this.evaluateAction(cognitoUserName, connectionId, CedarAction.GroupEdit, undefined, groupId);
		if (editAllowed) return AccessLevelEnum.edit;
		const readAllowed = await this.evaluateAction(cognitoUserName, connectionId, CedarAction.GroupRead, undefined, groupId);
		if (readAllowed) return AccessLevelEnum.readonly;
		return AccessLevelEnum.none;
	}

	async checkUserGroupRead(cognitoUserName: string, groupId: string): Promise<boolean> {
		const level = await this.getGroupAccessLevel(cognitoUserName, groupId);
		return level === AccessLevelEnum.edit || level === AccessLevelEnum.readonly;
	}

	async checkUserGroupEdit(cognitoUserName: string, groupId: string): Promise<boolean> {
		const level = await this.getGroupAccessLevel(cognitoUserName, groupId);
		return level === AccessLevelEnum.edit;
	}

	async getUserTablePermissions(
		cognitoUserName: string,
		connectionId: string,
		tableName: string,
		_masterPwd: string,
	): Promise<ITablePermissionData> {
		await this.assertUserNotSuspended(cognitoUserName);
		const results = await this.evaluateBatch(cognitoUserName, connectionId, [
			CedarAction.TableRead,
			CedarAction.TableAdd,
			CedarAction.TableEdit,
			CedarAction.TableDelete,
		], tableName);

		const canRead = results.get(CedarAction.TableRead);
		const canAdd = results.get(CedarAction.TableAdd);
		const canEdit = results.get(CedarAction.TableEdit);
		const canDelete = results.get(CedarAction.TableDelete);

		return {
			tableName,
			accessLevel: {
				visibility: canRead || canAdd || canEdit || canDelete,
				readonly: canRead && !canAdd && !canEdit && !canDelete,
				add: canAdd,
				delete: canDelete,
				edit: canEdit,
			},
		};
	}

	async getUserPermissionsForAvailableTables(
		cognitoUserName: string,
		connectionId: string,
		tableNames: Array<string>,
	): Promise<Array<ITablePermissionData>> {
		await this.assertUserNotSuspended(cognitoUserName);

		const userGroups = await this.globalDbContext.groupRepository.findAllUserGroupsInConnection(connectionId, cognitoUserName);
		if (userGroups.length === 0) {
			return [];
		}
		const groupPolicies = await this.loadPoliciesPerGroup(connectionId, userGroups);
		if (groupPolicies.length === 0) {
			return [];
		}

		// If user has connection:edit, they get full access to all tables
		const connEditEntities = buildCedarEntities(cognitoUserName, userGroups, connectionId);
		const hasConnectionEdit = this.evaluatePolicies(
			cognitoUserName, CedarAction.ConnectionEdit, CedarResourceType.Connection, connectionId, groupPolicies, connEditEntities,
		);
		if (hasConnectionEdit) {
			return tableNames.map((tableName) => ({
				tableName,
				accessLevel: {
					visibility: true,
					readonly: false,
					add: true,
					delete: true,
					edit: true,
				},
			}));
		}

		const actions = [CedarAction.TableRead, CedarAction.TableAdd, CedarAction.TableEdit, CedarAction.TableDelete];
		const result: Array<ITablePermissionData> = [];

		for (const tableName of tableNames) {
			const entities = buildCedarEntities(cognitoUserName, userGroups, connectionId, tableName);
			const actionResults = new Map<CedarAction, boolean>();

			for (const action of actions) {
				const resourceId = `${connectionId}/${tableName}`;
				const allowed = this.evaluatePolicies(
					cognitoUserName, action, CedarResourceType.Table, resourceId, groupPolicies, entities,
				);
				actionResults.set(action, allowed);
			}

			const canRead = actionResults.get(CedarAction.TableRead);
			const canAdd = actionResults.get(CedarAction.TableAdd);
			const canEdit = actionResults.get(CedarAction.TableEdit);
			const canDelete = actionResults.get(CedarAction.TableDelete);
			const visibility = canRead || canAdd || canEdit || canDelete;

			if (visibility) {
				result.push({
					tableName,
					accessLevel: {
						visibility: true,
						readonly: canRead && !canAdd && !canEdit && !canDelete,
						add: canAdd,
						delete: canDelete,
						edit: canEdit,
					},
				});
			}
		}

		return result;
	}

	async checkTableRead(
		cognitoUserName: string,
		connectionId: string,
		tableName: string,
		_masterPwd: string,
	): Promise<boolean> {
		await this.assertUserNotSuspended(cognitoUserName);
		return this.evaluateAction(cognitoUserName, connectionId, CedarAction.TableRead, tableName);
	}

	async checkTableAdd(
		cognitoUserName: string,
		connectionId: string,
		tableName: string,
		_masterPwd: string,
	): Promise<boolean> {
		await this.assertUserNotSuspended(cognitoUserName);
		return this.evaluateAction(cognitoUserName, connectionId, CedarAction.TableAdd, tableName);
	}

	async checkTableDelete(
		cognitoUserName: string,
		connectionId: string,
		tableName: string,
		_masterPwd: string,
	): Promise<boolean> {
		await this.assertUserNotSuspended(cognitoUserName);
		return this.evaluateAction(cognitoUserName, connectionId, CedarAction.TableDelete, tableName);
	}

	async checkTableEdit(
		cognitoUserName: string,
		connectionId: string,
		tableName: string,
		_masterPwd: string,
	): Promise<boolean> {
		await this.assertUserNotSuspended(cognitoUserName);
		return this.evaluateAction(cognitoUserName, connectionId, CedarAction.TableEdit, tableName);
	}

	async getConnectionId(groupId: string): Promise<string> {
		const group = await this.globalDbContext.groupRepository.findGroupByIdWithConnectionAndUsers(groupId);
		if (!group?.connection?.id) {
			throw new HttpException({ message: Messages.CONNECTION_NOT_FOUND }, HttpStatus.BAD_REQUEST);
		}
		return group.connection.id;
	}

	async improvedCheckTableRead(userId: string, connectionId: string, tableName: string, _masterPwd?: string): Promise<boolean> {
		const cachedReadPermission: boolean | null = Cacher.getUserTableReadPermissionCache(
			userId,
			connectionId,
			tableName,
		);
		if (cachedReadPermission !== null) {
			return cachedReadPermission;
		}

		const canRead = await this.evaluateAction(userId, connectionId, CedarAction.TableRead, tableName);
		Cacher.setUserTableReadPermissionCache(userId, connectionId, tableName, canRead);
		return canRead;
	}

	private async evaluateBatch(
		userId: string,
		connectionId: string,
		actions: CedarAction[],
		tableName?: string,
		groupId?: string,
	): Promise<Map<CedarAction, boolean>> {
		const userGroups = await this.globalDbContext.groupRepository.findAllUserGroupsInConnection(connectionId, userId);
		if (userGroups.length === 0) {
			return new Map(actions.map(a => [a, false]));
		}

		const groupPolicies = await this.loadPoliciesPerGroup(connectionId, userGroups);
		if (groupPolicies.length === 0) {
			return new Map(actions.map(a => [a, false]));
		}

		const dashboardId = undefined;
		const entities = buildCedarEntities(userId, userGroups, connectionId, tableName, dashboardId);

		const results = new Map<CedarAction, boolean>();
		for (const action of actions) {
			const actionPrefix = action.split(':')[0];
			let resourceType: CedarResourceType;
			let resourceId: string;

			switch (actionPrefix) {
				case 'connection':
					resourceType = CedarResourceType.Connection;
					resourceId = connectionId;
					break;
				case 'group':
					resourceType = CedarResourceType.Group;
					resourceId = groupId;
					break;
				case 'table':
					resourceType = CedarResourceType.Table;
					resourceId = `${connectionId}/${tableName}`;
					break;
				default:
					results.set(action, false);
					continue;
			}

			results.set(action, this.evaluatePolicies(userId, action, resourceType, resourceId, groupPolicies, entities));
		}

		return results;
	}

	private evaluatePolicies(
		userId: string,
		action: CedarAction,
		resourceType: CedarResourceType,
		resourceId: string,
		policies: string[],
		entities: ReturnType<typeof buildCedarEntities>,
	): boolean {
		for (const policy of policies) {
			const call = {
				principal: { type: CEDAR_USER_TYPE, id: userId },
				action: { type: CEDAR_ACTION_TYPE, id: action },
				resource: { type: resourceType as string, id: resourceId },
				context: {},
				policies: { staticPolicies: policy },
				entities: entities,
				schema: this.schema,
			};

			const result = cedarWasm.isAuthorized(call as Parameters<typeof cedarWasm.isAuthorized>[0]);
			if (result.type === 'success' && result.response.decision === 'allow') {
				return true;
			}
		}
		return false;
	}

	private async evaluateAction(
		userId: string,
		connectionId: string,
		action: CedarAction,
		tableName?: string,
		groupId?: string,
	): Promise<boolean> {
		const userGroups = await this.globalDbContext.groupRepository.findAllUserGroupsInConnection(connectionId, userId);
		if (userGroups.length === 0) return false;

		const groupPolicies = await this.loadPoliciesPerGroup(connectionId, userGroups);
		if (groupPolicies.length === 0) return false;

		const entities = buildCedarEntities(userId, userGroups, connectionId, tableName);

		const actionPrefix = action.split(':')[0];
		let resourceType: CedarResourceType;
		let resourceId: string;

		switch (actionPrefix) {
			case 'connection':
				resourceType = CedarResourceType.Connection;
				resourceId = connectionId;
				break;
			case 'group':
				resourceType = CedarResourceType.Group;
				resourceId = groupId;
				break;
			case 'table':
				resourceType = CedarResourceType.Table;
				resourceId = `${connectionId}/${tableName}`;
				break;
			default:
				return false;
		}

		return this.evaluatePolicies(userId, action, resourceType, resourceId, groupPolicies, entities);
	}

	private async loadPoliciesPerGroup(connectionId: string, userGroups: Array<GroupEntity>): Promise<string[]> {
		const groups = await this.globalDbContext.groupRepository.findAllGroupsInConnection(connectionId);
		const userGroupIdSet = new Set(userGroups.map((g) => g.id));
		return groups
			.filter((g) => userGroupIdSet.has(g.id))
			.map((g) => g.cedarPolicy)
			.filter(Boolean);
	}

	private async assertUserNotSuspended(userId: string): Promise<void> {
		const user = await this.globalDbContext.userRepository.findOne({
			where: { id: userId },
			select: ['id', 'suspended'],
		});
		if (user?.suspended) {
			throw new HttpException(
				{
					message: Messages.ACCOUNT_SUSPENDED,
				},
				HttpStatus.FORBIDDEN,
			);
		}
	}
}
