import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AccessLevelEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { Cacher } from '../../helpers/cache/cacher.js';
import { IGlobalDatabaseContext } from '../../common/application/global-database-context.interface.js';
import { BaseType } from '../../common/data-injection.tokens.js';
import { GroupEntity } from '../group/group.entity.js';
import { ITablePermissionData } from '../permission/permission.interface.js';
import { CedarAction, CedarResourceType, CEDAR_ACTION_TYPE, CEDAR_USER_TYPE } from './cedar-action-map.js';
import { buildCedarEntities } from './cedar-entity-builder.js';
import { CEDAR_SCHEMA } from './cedar-schema.js';
import * as cedarWasm from '@cedar-policy/cedar-wasm/nodejs';
import { IUserAccessRepository } from '../user-access/repository/user-access.repository.interface.js';

interface EvalContext {
	userGroups: Array<GroupEntity>;
	policies: string[];
}

@Injectable()
export class CedarPermissionsService implements IUserAccessRepository {
	private readonly schema: Record<string, unknown> = CEDAR_SCHEMA as Record<string, unknown>;

	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		private readonly globalDbContext: IGlobalDatabaseContext,
	) {}

	async getUserConnectionAccessLevel(cognitoUserName: string, connectionId: string): Promise<AccessLevelEnum> {
		const ctx = await this.loadContext(connectionId, cognitoUserName);
		if (!ctx) return AccessLevelEnum.none;

		const entities = buildCedarEntities(cognitoUserName, ctx.userGroups, connectionId);
		if (
			this.evaluatePolicies(
				cognitoUserName,
				CedarAction.ConnectionEdit,
				CedarResourceType.Connection,
				connectionId,
				ctx.policies,
				entities,
			)
		) {
			return AccessLevelEnum.edit;
		}
		if (
			this.evaluatePolicies(
				cognitoUserName,
				CedarAction.ConnectionRead,
				CedarResourceType.Connection,
				connectionId,
				ctx.policies,
				entities,
			)
		) {
			return AccessLevelEnum.readonly;
		}
		return AccessLevelEnum.none;
	}

	async checkUserConnectionRead(cognitoUserName: string, connectionId: string): Promise<boolean> {
		const ctx = await this.loadContext(connectionId, cognitoUserName);
		if (!ctx) return false;

		const entities = buildCedarEntities(cognitoUserName, ctx.userGroups, connectionId);
		return (
			this.evaluatePolicies(
				cognitoUserName,
				CedarAction.ConnectionRead,
				CedarResourceType.Connection,
				connectionId,
				ctx.policies,
				entities,
			) ||
			this.evaluatePolicies(
				cognitoUserName,
				CedarAction.ConnectionEdit,
				CedarResourceType.Connection,
				connectionId,
				ctx.policies,
				entities,
			)
		);
	}

	async checkUserConnectionEdit(cognitoUserName: string, connectionId: string): Promise<boolean> {
		const ctx = await this.loadContext(connectionId, cognitoUserName);
		if (!ctx) return false;

		const entities = buildCedarEntities(cognitoUserName, ctx.userGroups, connectionId);
		return this.evaluatePolicies(
			cognitoUserName,
			CedarAction.ConnectionEdit,
			CedarResourceType.Connection,
			connectionId,
			ctx.policies,
			entities,
		);
	}

	async getGroupAccessLevel(cognitoUserName: string, groupId: string): Promise<AccessLevelEnum> {
		const connectionId = await this.getConnectionId(groupId);
		const ctx = await this.loadContext(connectionId, cognitoUserName);
		if (!ctx) return AccessLevelEnum.none;

		const entities = buildCedarEntities(cognitoUserName, ctx.userGroups, connectionId);
		const resourceId = groupId;
		if (
			this.evaluatePolicies(
				cognitoUserName,
				CedarAction.GroupEdit,
				CedarResourceType.Group,
				resourceId,
				ctx.policies,
				entities,
			)
		) {
			return AccessLevelEnum.edit;
		}
		if (
			this.evaluatePolicies(
				cognitoUserName,
				CedarAction.GroupRead,
				CedarResourceType.Group,
				resourceId,
				ctx.policies,
				entities,
			)
		) {
			return AccessLevelEnum.readonly;
		}
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
		const ctx = await this.loadContext(connectionId, cognitoUserName);
		if (!ctx) {
			return { tableName, accessLevel: { visibility: false, readonly: false, add: false, delete: false, edit: false } };
		}

		return this.evaluateTablePermissions(cognitoUserName, connectionId, tableName, ctx);
	}

	async getUserPermissionsForAvailableTables(
		cognitoUserName: string,
		connectionId: string,
		tableNames: Array<string>,
	): Promise<Array<ITablePermissionData>> {
		const ctx = await this.loadContext(connectionId, cognitoUserName);
		if (!ctx) return [];

		const result: Array<ITablePermissionData> = [];
		for (const tableName of tableNames) {
			const perm = this.evaluateTablePermissions(cognitoUserName, connectionId, tableName, ctx);
			if (perm.accessLevel.visibility) {
				result.push(perm);
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
		const ctx = await this.loadContext(connectionId, cognitoUserName);
		if (!ctx) return false;

		const entities = buildCedarEntities(cognitoUserName, ctx.userGroups, connectionId, tableName);
		return this.evaluatePolicies(
			cognitoUserName,
			CedarAction.TableRead,
			CedarResourceType.Table,
			`${connectionId}/${tableName}`,
			ctx.policies,
			entities,
		);
	}

	async checkTableAdd(
		cognitoUserName: string,
		connectionId: string,
		tableName: string,
		_masterPwd: string,
	): Promise<boolean> {
		const ctx = await this.loadContext(connectionId, cognitoUserName);
		if (!ctx) return false;

		const entities = buildCedarEntities(cognitoUserName, ctx.userGroups, connectionId, tableName);
		return this.evaluatePolicies(
			cognitoUserName,
			CedarAction.TableAdd,
			CedarResourceType.Table,
			`${connectionId}/${tableName}`,
			ctx.policies,
			entities,
		);
	}

	async checkTableDelete(
		cognitoUserName: string,
		connectionId: string,
		tableName: string,
		_masterPwd: string,
	): Promise<boolean> {
		const ctx = await this.loadContext(connectionId, cognitoUserName);
		if (!ctx) return false;

		const entities = buildCedarEntities(cognitoUserName, ctx.userGroups, connectionId, tableName);
		return this.evaluatePolicies(
			cognitoUserName,
			CedarAction.TableDelete,
			CedarResourceType.Table,
			`${connectionId}/${tableName}`,
			ctx.policies,
			entities,
		);
	}

	async checkTableEdit(
		cognitoUserName: string,
		connectionId: string,
		tableName: string,
		_masterPwd: string,
	): Promise<boolean> {
		const ctx = await this.loadContext(connectionId, cognitoUserName);
		if (!ctx) return false;

		const entities = buildCedarEntities(cognitoUserName, ctx.userGroups, connectionId, tableName);
		return this.evaluatePolicies(
			cognitoUserName,
			CedarAction.TableEdit,
			CedarResourceType.Table,
			`${connectionId}/${tableName}`,
			ctx.policies,
			entities,
		);
	}

	async getConnectionId(groupId: string): Promise<string> {
		const group = await this.globalDbContext.groupRepository.findGroupByIdWithConnectionAndUsers(groupId);
		if (!group?.connection?.id) {
			throw new HttpException({ message: Messages.CONNECTION_NOT_FOUND }, HttpStatus.BAD_REQUEST);
		}
		return group.connection.id;
	}

	async improvedCheckTableRead(
		userId: string,
		connectionId: string,
		tableName: string,
		_masterPwd?: string,
	): Promise<boolean> {
		const cachedReadPermission: boolean | null = Cacher.getUserTableReadPermissionCache(
			userId,
			connectionId,
			tableName,
		);
		if (cachedReadPermission !== null) {
			return cachedReadPermission;
		}

		const canRead = await this.checkTableRead(userId, connectionId, tableName, undefined);
		Cacher.setUserTableReadPermissionCache(userId, connectionId, tableName, canRead);
		return canRead;
	}

	private evaluateTablePermissions(
		userId: string,
		connectionId: string,
		tableName: string,
		ctx: EvalContext,
	): ITablePermissionData {
		const entities = buildCedarEntities(userId, ctx.userGroups, connectionId, tableName);
		const resourceId = `${connectionId}/${tableName}`;

		const canRead = this.evaluatePolicies(
			userId,
			CedarAction.TableRead,
			CedarResourceType.Table,
			resourceId,
			ctx.policies,
			entities,
		);
		const canAdd = this.evaluatePolicies(
			userId,
			CedarAction.TableAdd,
			CedarResourceType.Table,
			resourceId,
			ctx.policies,
			entities,
		);
		const canEdit = this.evaluatePolicies(
			userId,
			CedarAction.TableEdit,
			CedarResourceType.Table,
			resourceId,
			ctx.policies,
			entities,
		);
		const canDelete = this.evaluatePolicies(
			userId,
			CedarAction.TableDelete,
			CedarResourceType.Table,
			resourceId,
			ctx.policies,
			entities,
		);

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

	private async loadContext(connectionId: string, userId: string): Promise<EvalContext | null> {
		const userGroups = await this.globalDbContext.groupRepository.findAllUserGroupsInConnection(connectionId, userId);
		if (userGroups.length === 0) return null;

		const policies = userGroups.map((g) => g.cedarPolicy).filter(Boolean);
		if (policies.length === 0) return null;

		return { userGroups, policies };
	}

}
