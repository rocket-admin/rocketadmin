import * as cedarWasm from '@cedar-policy/cedar-wasm/nodejs';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { IGlobalDatabaseContext } from '../../common/application/global-database-context.interface.js';
import { BaseType } from '../../common/data-injection.tokens.js';
import { AccessLevelEnum } from '../../enums/access-level.enum.js';
import { ConnectionNotFoundException } from '../../exceptions/custom-exceptions/connection-not-found-exception.js';
import { Cacher } from '../../helpers/cache/cacher.js';
import { GroupEntity } from '../group/group.entity.js';
import { ITablePermissionData } from '../permission/permission.interface.js';
import { IUserAccessRepository } from '../user-access/repository/user-access.repository.interface.js';
import {
	ACTION_EVENT_PROBE_ID,
	CEDAR_ACTION_TYPE,
	CEDAR_USER_TYPE,
	CedarAction,
	CedarResourceType,
	COLUMN_PROBE_ID,
	PUBLIC_USER_ID,
} from './cedar-action-map.js';
import { buildCedarEntities } from './cedar-entity-builder.js';
import { CEDAR_SCHEMA } from './cedar-schema.js';

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

	async getUserConnectionAccessLevelsForMultipleConnections(
		userId: string,
		connectionIds: Array<string>,
	): Promise<Map<string, AccessLevelEnum>> {
		const result = new Map<string, AccessLevelEnum>();
		if (connectionIds.length === 0) return result;

		const allGroups = await this.globalDbContext.groupRepository.findAllUserGroupsInConnections(connectionIds, userId);

		const groupsByConnection = new Map<string, Array<GroupEntity>>();
		for (const group of allGroups) {
			const connId = group.connection?.id;
			if (!connId) continue;
			let connectionGroups = groupsByConnection.get(connId);
			if (!connectionGroups) {
				connectionGroups = [];
				groupsByConnection.set(connId, connectionGroups);
			}
			connectionGroups.push(group);
		}

		for (const connectionId of connectionIds) {
			const userGroups = groupsByConnection.get(connectionId);
			if (!userGroups || userGroups.length === 0) {
				result.set(connectionId, AccessLevelEnum.none);
				continue;
			}

			const policies = userGroups.map((g) => g.cedarPolicy).filter((policy): policy is string => Boolean(policy));
			if (policies.length === 0) {
				result.set(connectionId, AccessLevelEnum.none);
				continue;
			}

			const entities = buildCedarEntities(userId, userGroups, connectionId);
			if (
				this.evaluatePolicies(
					userId,
					CedarAction.ConnectionEdit,
					CedarResourceType.Connection,
					connectionId,
					policies,
					entities,
				)
			) {
				result.set(connectionId, AccessLevelEnum.edit);
			} else if (
				this.evaluatePolicies(
					userId,
					CedarAction.ConnectionRead,
					CedarResourceType.Connection,
					connectionId,
					policies,
					entities,
				)
			) {
				result.set(connectionId, AccessLevelEnum.readonly);
			} else {
				result.set(connectionId, AccessLevelEnum.none);
			}
		}

		return result;
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
			return {
				tableName,
				accessLevel: {
					visibility: false,
					readonly: false,
					add: false,
					delete: false,
					edit: false,
					aiRequest: false,
					triggerCustomAction: false,
				},
			};
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

	// "Table read" now means "may query this table" (the QueryTable half of the table:read
	// alias). Column-level visibility is enforced separately via checkColumnRead/getReadableColumns.
	async checkTableRead(
		cognitoUserName: string,
		connectionId: string,
		tableName: string,
		_masterPwd?: string,
	): Promise<boolean> {
		const ctx = await this.loadContext(connectionId, cognitoUserName);
		if (!ctx) return false;

		return this.evaluateTableQuery(cognitoUserName, connectionId, tableName, ctx);
	}

	async checkColumnRead(
		cognitoUserName: string,
		connectionId: string,
		tableName: string,
		columnName: string,
	): Promise<boolean> {
		const ctx = await this.loadContext(connectionId, cognitoUserName);
		if (!ctx) return false;

		return this.evaluateColumnRead(cognitoUserName, connectionId, tableName, columnName, ctx);
	}

	// Returns the subset of `allColumnNames` the user may read. A single probe detects a
	// table-wide grant (the table:read alias → ColumnRead(table, *)); only column-restricted
	// tables pay a per-column evaluation.
	async getReadableColumns(
		cognitoUserName: string,
		connectionId: string,
		tableName: string,
		allColumnNames: Array<string>,
	): Promise<Set<string>> {
		const ctx = await this.loadContext(connectionId, cognitoUserName);
		if (!ctx) return new Set();

		if (this.evaluateColumnRead(cognitoUserName, connectionId, tableName, COLUMN_PROBE_ID, ctx)) {
			return new Set(allColumnNames);
		}

		const readable = new Set<string>();
		for (const columnName of allColumnNames) {
			if (this.evaluateColumnRead(cognitoUserName, connectionId, tableName, columnName, ctx)) {
				readable.add(columnName);
			}
		}
		return readable;
	}

	// Public (unauthenticated) counterpart of getReadableColumns: evaluates the connection's
	// public_cedar_policy instead of any user's group policies. Returns the readable subset, or an
	// empty set when public access is disabled.
	async getReadableColumnsForPublic(
		connectionId: string,
		tableName: string,
		allColumnNames: Array<string>,
	): Promise<Set<string>> {
		const ctx = await this.loadPublicContext(connectionId);
		if (!ctx) return new Set();

		if (this.evaluateColumnRead(PUBLIC_USER_ID, connectionId, tableName, COLUMN_PROBE_ID, ctx)) {
			return new Set(allColumnNames);
		}

		const readable = new Set<string>();
		for (const columnName of allColumnNames) {
			if (this.evaluateColumnRead(PUBLIC_USER_ID, connectionId, tableName, columnName, ctx)) {
				readable.add(columnName);
			}
		}
		return readable;
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

	async checkActionEventTrigger(
		cognitoUserName: string,
		connectionId: string,
		tableName: string,
		actionEventId: string,
		_masterPwd?: string,
	): Promise<boolean> {
		const ctx = await this.loadContext(connectionId, cognitoUserName);
		if (!ctx) return false;

		const entities = buildCedarEntities(
			cognitoUserName,
			ctx.userGroups,
			connectionId,
			tableName,
			undefined,
			undefined,
			actionEventId,
		);
		return this.evaluatePolicies(
			cognitoUserName,
			CedarAction.ActionEventTrigger,
			CedarResourceType.ActionEvent,
			`${connectionId}/${tableName}/${actionEventId}`,
			ctx.policies,
			entities,
		);
	}

	async getConnectionId(groupId: string): Promise<string> {
		const group = await this.globalDbContext.groupRepository.findGroupByIdWithConnectionAndUsers(groupId);
		if (!group?.connection?.id) {
			throw new ConnectionNotFoundException(HttpStatus.BAD_REQUEST);
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

		const canRead = this.evaluateTableQuery(userId, connectionId, tableName, ctx);
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
		const canAiRequest = this.evaluatePolicies(
			userId,
			CedarAction.TableAiRequest,
			CedarResourceType.Table,
			resourceId,
			ctx.policies,
			entities,
		);
		// "Blanket trigger on this table" — only `permit(... resource in Table::"...")` policies
		// match this synthetic probe event. Per-event grants (resource == ActionEvent::"...x")
		// won't match the probe id, so the table-level flag stays false unless the user truly
		// has table-wide trigger.
		const probeEntities = buildCedarEntities(
			userId,
			ctx.userGroups,
			connectionId,
			tableName,
			undefined,
			undefined,
			ACTION_EVENT_PROBE_ID,
		);
		const canTriggerAnyCustomAction = this.evaluatePolicies(
			userId,
			CedarAction.ActionEventTrigger,
			CedarResourceType.ActionEvent,
			`${connectionId}/${tableName}/${ACTION_EVENT_PROBE_ID}`,
			ctx.policies,
			probeEntities,
		);

		return {
			tableName,
			accessLevel: {
				visibility: canRead || canAdd || canEdit || canDelete,
				readonly: canRead && !canAdd && !canEdit && !canDelete,
				add: canAdd,
				delete: canDelete,
				edit: canEdit,
				aiRequest: canAiRequest,
				triggerCustomAction: canTriggerAnyCustomAction,
			},
		};
	}

	// QueryTable check honoring the table:read alias: a direct table:read grant (legacy or
	// hand-written policy) also permits querying the table.
	private evaluateTableQuery(userId: string, connectionId: string, tableName: string, ctx: EvalContext): boolean {
		const entities = buildCedarEntities(userId, ctx.userGroups, connectionId, tableName);
		const resourceId = `${connectionId}/${tableName}`;
		return (
			this.evaluatePolicies(
				userId,
				CedarAction.TableQuery,
				CedarResourceType.Table,
				resourceId,
				ctx.policies,
				entities,
			) ||
			this.evaluatePolicies(userId, CedarAction.TableRead, CedarResourceType.Table, resourceId, ctx.policies, entities)
		);
	}

	private evaluateColumnRead(
		userId: string,
		connectionId: string,
		tableName: string,
		columnName: string,
		ctx: EvalContext,
	): boolean {
		const columnEntities = buildCedarEntities(
			userId,
			ctx.userGroups,
			connectionId,
			tableName,
			undefined,
			undefined,
			undefined,
			columnName,
		);
		if (
			this.evaluatePolicies(
				userId,
				CedarAction.ColumnRead,
				CedarResourceType.Column,
				`${connectionId}/${tableName}/${columnName}`,
				ctx.policies,
				columnEntities,
			)
		) {
			return true;
		}
		// Legacy alias: a direct table:read grant covers every column of the table.
		const tableEntities = buildCedarEntities(userId, ctx.userGroups, connectionId, tableName);
		return this.evaluatePolicies(
			userId,
			CedarAction.TableRead,
			CedarResourceType.Table,
			`${connectionId}/${tableName}`,
			ctx.policies,
			tableEntities,
		);
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

		const policies = userGroups.map((g) => g.cedarPolicy).filter((policy): policy is string => Boolean(policy));
		if (policies.length === 0) return null;

		return { userGroups, policies };
	}

	// Public-access context: no groups, a single policy taken from the connection's
	// public_cedar_policy. The synthetic principal is irrelevant since generated policies leave the
	// principal unconstrained.
	private async loadPublicContext(connectionId: string): Promise<EvalContext | null> {
		const policy = await this.loadPublicPolicy(connectionId);
		if (!policy) return null;
		return { userGroups: [], policies: [policy] };
	}

	private async loadPublicPolicy(connectionId: string): Promise<string | null> {
		const cached = Cacher.getCedarPolicyCache(connectionId, PUBLIC_USER_ID);
		if (cached !== null) {
			return cached.trim().length > 0 ? cached : null;
		}
		const policy = await this.globalDbContext.connectionRepository.getConnectionPublicCedarPolicy(connectionId);
		Cacher.setCedarPolicyCache(connectionId, PUBLIC_USER_ID, policy ?? '');
		return policy && policy.trim().length > 0 ? policy : null;
	}
}
