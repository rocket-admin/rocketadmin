import { HttpException, HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AccessLevelEnum, PermissionTypeEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { Cacher } from '../../helpers/cache/cacher.js';
import { IGlobalDatabaseContext } from '../../common/application/global-database-context.interface.js';
import { BaseType } from '../../common/data-injection.tokens.js';
import { GroupEntity } from '../group/group.entity.js';
import { IComplexPermission } from '../permission/permission.interface.js';
import { PermissionEntity } from '../permission/permission.entity.js';
import {
	CedarAction,
	CedarResourceType,
	CedarValidationRequest,
	CEDAR_ACTION_TYPE,
	CEDAR_USER_TYPE,
} from './cedar-action-map.js';
import { ICedarAuthorizationService } from './cedar-authorization.service.interface.js';
import { buildCedarEntities } from './cedar-entity-builder.js';
import { parseCedarPolicyToClassicalPermissions } from './cedar-policy-parser.js';
import { CEDAR_SCHEMA } from './cedar-schema.js';
import * as cedarWasm from '@cedar-policy/cedar-wasm/nodejs';

@Injectable()
export class CedarAuthorizationService implements ICedarAuthorizationService, OnModuleInit {
	private schema: Record<string, unknown>;
	private readonly logger = new Logger(CedarAuthorizationService.name);

	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		private readonly globalDbContext: IGlobalDatabaseContext,
	) {}

	async onModuleInit(): Promise<void> {
		if (!this.isFeatureEnabled()) return;
		this.schema = CEDAR_SCHEMA as Record<string, unknown>;
		this.logger.log('Cedar authorization service initialized');
	}

	isFeatureEnabled(): boolean {
		return process.env.CEDAR_AUTHORIZATION_ENABLED === 'true';
	}

	async validate(request: CedarValidationRequest): Promise<boolean> {
		const { userId, action, groupId, tableName, dashboardId } = request;
		let { connectionId } = request;

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
				connectionId = await this.getConnectionIdForGroup(groupId);
				if (!connectionId) return false;
				resourceId = groupId;
				break;
			case 'table':
				resourceType = CedarResourceType.Table;
				resourceId = `${connectionId}/${tableName}`;
				break;
			case 'dashboard': {
				resourceType = CedarResourceType.Dashboard;
				const needsSentinel = action === CedarAction.DashboardCreate || !dashboardId;
				const effectiveDashboardId = needsSentinel ? '__new__' : dashboardId;
				resourceId = `${connectionId}/${effectiveDashboardId}`;
				return this.evaluate(userId, connectionId, action, resourceType, resourceId, tableName, effectiveDashboardId);
			}
			default:
				return false;
		}

		return this.evaluate(userId, connectionId, action, resourceType, resourceId, tableName, dashboardId);
	}

	invalidatePolicyCacheForConnection(connectionId: string): void {
		Cacher.invalidateCedarPolicyCache(connectionId);
	}

	getSchema(): Record<string, unknown> {
		return this.schema;
	}

	async saveCedarPolicy(
		connectionId: string,
		groupId: string,
		cedarPolicy: string,
	): Promise<{ cedarPolicy: string; classicalPermissions: IComplexPermission }> {
		this.validateCedarPolicyText(cedarPolicy);

		const group = await this.globalDbContext.groupRepository.findGroupWithPermissionsById(groupId);
		if (!group) {
			throw new HttpException({ message: Messages.GROUP_NOT_FOUND }, HttpStatus.BAD_REQUEST);
		}

		const groupWithConnection = await this.globalDbContext.groupRepository.findGroupByIdWithConnectionAndUsers(groupId);

		if (groupWithConnection?.connection?.id !== connectionId) {
			throw new HttpException({ message: Messages.GROUP_NOT_FROM_THIS_CONNECTION }, HttpStatus.BAD_REQUEST);
		}

		if (group.isMain) {
			throw new HttpException({ message: Messages.CANNOT_CHANGE_ADMIN_GROUP }, HttpStatus.BAD_REQUEST);
		}

		await this.validatePolicyReferences(cedarPolicy, connectionId);

		const classicalPermissions = parseCedarPolicyToClassicalPermissions(cedarPolicy, connectionId, groupId);

		await this.syncClassicalPermissions(group, classicalPermissions);

		group.cedarPolicy = cedarPolicy;
		await this.globalDbContext.groupRepository.saveNewOrUpdatedGroup(group);
		Cacher.invalidateCedarPolicyCache(connectionId);

		return { cedarPolicy, classicalPermissions };
	}

	validateCedarSchema(schema: Record<string, unknown>): void {
		if (!schema || typeof schema !== 'object') {
			throw new HttpException({ message: 'Cedar schema must be a valid JSON object' }, HttpStatus.BAD_REQUEST);
		}

		const namespaces = Object.keys(schema);
		if (namespaces.length === 0) {
			throw new HttpException({ message: 'Cedar schema must contain at least one namespace' }, HttpStatus.BAD_REQUEST);
		}

		for (const ns of namespaces) {
			const namespace = schema[ns] as Record<string, unknown>;
			if (!namespace || typeof namespace !== 'object') {
				throw new HttpException({ message: `Namespace "${ns}" must be an object` }, HttpStatus.BAD_REQUEST);
			}

			if (!namespace.entityTypes || typeof namespace.entityTypes !== 'object') {
				throw new HttpException(
					{ message: `Namespace "${ns}" must contain "entityTypes" object` },
					HttpStatus.BAD_REQUEST,
				);
			}

			if (!namespace.actions || typeof namespace.actions !== 'object') {
				throw new HttpException({ message: `Namespace "${ns}" must contain "actions" object` }, HttpStatus.BAD_REQUEST);
			}
		}

		try {
			const testCall = {
				principal: { type: 'RocketAdmin::User', id: 'test' },
				action: { type: 'RocketAdmin::Action', id: 'connection:read' },
				resource: { type: 'RocketAdmin::Connection', id: 'test' },
				context: {},
				policies: { staticPolicies: 'permit(principal, action, resource);' },
				entities: [],
				schema: schema,
			};
			const result = cedarWasm.isAuthorized(testCall as Parameters<typeof cedarWasm.isAuthorized>[0]);
			if (result.type !== 'success') {
				const errors = (result as unknown as { type: string; errors: string[] }).errors ?? [];
				throw new HttpException(
					{ message: `Invalid cedar schema: ${errors.join('; ') || 'unknown validation error'}` },
					HttpStatus.BAD_REQUEST,
				);
			}
		} catch (e) {
			if (e instanceof HttpException) throw e;
			throw new HttpException({ message: `Invalid cedar schema: ${e.message}` }, HttpStatus.BAD_REQUEST);
		}
	}

	private async evaluate(
		userId: string,
		connectionId: string,
		action: CedarAction,
		resourceType: CedarResourceType,
		resourceId: string,
		tableName?: string,
		dashboardId?: string,
	): Promise<boolean> {
		await this.assertUserNotSuspended(userId);

		const userGroups = await this.globalDbContext.groupRepository.findAllUserGroupsInConnection(connectionId, userId);
		if (userGroups.length === 0) return false;

		const userGroupIds = userGroups.map((g) => g.id);
		const policies = await this.loadPoliciesForUser(connectionId, userId, userGroupIds);
		if (!policies) return false;

		const entities = buildCedarEntities(userId, userGroups, connectionId, tableName, dashboardId);

		const call = {
			principal: { type: CEDAR_USER_TYPE, id: userId },
			action: { type: CEDAR_ACTION_TYPE, id: action },
			resource: { type: resourceType as string, id: resourceId },
			context: {},
			policies: { staticPolicies: policies },
			entities: entities,
			schema: this.schema,
		};

		const result = cedarWasm.isAuthorized(call as Parameters<typeof cedarWasm.isAuthorized>[0]);
		if (result.type === 'success') {
			return result.response.decision === 'allow';
		}

		this.logger.warn(`Cedar authorization error: ${JSON.stringify(result.errors)}`);
		return false;
	}

	private async loadPoliciesForUser(connectionId: string, userId: string, userGroupIds: string[]): Promise<string | null> {
		const cached = Cacher.getCedarPolicyCache(connectionId, userId);
		if (cached !== null) return cached;

		const groups = await this.globalDbContext.groupRepository.findAllGroupsInConnection(connectionId);
		const userGroupIdSet = new Set(userGroupIds);
		const policyTexts = groups
			.filter((g) => userGroupIdSet.has(g.id))
			.map((g) => g.cedarPolicy)
			.filter(Boolean);

		if (policyTexts.length === 0) return null;

		const combined = policyTexts.join('\n\n');
		Cacher.setCedarPolicyCache(connectionId, userId, combined);
		return combined;
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

	private async getConnectionIdForGroup(groupId: string): Promise<string | null> {
		const group = await this.globalDbContext.groupRepository.findGroupByIdWithConnectionAndUsers(groupId);
		return group?.connection?.id ?? null;
	}

	private validateCedarPolicyText(policyText: string): void {
		if (!policyText || typeof policyText !== 'string' || policyText.trim().length === 0) {
			throw new HttpException({ message: 'Cedar policy must be a non-empty string' }, HttpStatus.BAD_REQUEST);
		}

		try {
			const testCall = {
				principal: { type: 'RocketAdmin::User', id: 'test' },
				action: { type: 'RocketAdmin::Action', id: 'connection:read' },
				resource: { type: 'RocketAdmin::Connection', id: 'test' },
				context: {},
				policies: { staticPolicies: policyText },
				entities: [],
				schema: this.schema,
			};
			cedarWasm.isAuthorized(testCall as Parameters<typeof cedarWasm.isAuthorized>[0]);
		} catch (e) {
			throw new HttpException({ message: `Invalid cedar policy: ${e.message}` }, HttpStatus.BAD_REQUEST);
		}
	}

	private async validatePolicyReferences(
		cedarPolicy: string,
		connectionId: string,
	): Promise<void> {
		const connectionIds = [
			...cedarPolicy.matchAll(/resource\s*==\s*RocketAdmin::Connection::"([^"]+)"/g),
		].map((m) => m[1]);

		for (const refConnectionId of connectionIds) {
			if (refConnectionId !== connectionId) {
				throw new HttpException(
					{ message: Messages.CEDAR_POLICY_REFERENCES_FOREIGN_CONNECTION },
					HttpStatus.BAD_REQUEST,
				);
			}
		}

		const groupResourceIds = [
			...cedarPolicy.matchAll(/resource\s*==\s*RocketAdmin::Group::"([^"]+)"/g),
		].map((m) => m[1]);

		if (groupResourceIds.length > 0) {
			const connectionGroups = await this.globalDbContext.groupRepository.findAllGroupsInConnection(connectionId);
			const connectionGroupIds = new Set(connectionGroups.map((g) => g.id));

			for (const refGroupId of groupResourceIds) {
				if (!connectionGroupIds.has(refGroupId)) {
					throw new HttpException(
						{ message: Messages.CEDAR_POLICY_REFERENCES_FOREIGN_GROUP },
						HttpStatus.BAD_REQUEST,
					);
				}
			}
		}

		const tableResourceIds = [
			...cedarPolicy.matchAll(/resource\s*==\s*RocketAdmin::Table::"([^"]+)"/g),
		].map((m) => m[1]);

		for (const tableRef of tableResourceIds) {
			if (!tableRef.startsWith(`${connectionId}/`)) {
				throw new HttpException(
					{ message: Messages.CEDAR_POLICY_REFERENCES_FOREIGN_CONNECTION },
					HttpStatus.BAD_REQUEST,
				);
			}
		}

		const dashboardResourceIds = [
			...cedarPolicy.matchAll(/resource\s*==\s*RocketAdmin::Dashboard::"([^"]+)"/g),
		].map((m) => m[1]);

		for (const dashboardRef of dashboardResourceIds) {
			if (!dashboardRef.startsWith(`${connectionId}/`)) {
				throw new HttpException(
					{ message: Messages.CEDAR_POLICY_REFERENCES_FOREIGN_CONNECTION },
					HttpStatus.BAD_REQUEST,
				);
			}
		}
	}

	private async syncClassicalPermissions(group: GroupEntity, permissions: IComplexPermission): Promise<void> {
		if (group.permissions && group.permissions.length > 0) {
			for (const perm of group.permissions) {
				await this.globalDbContext.permissionRepository.removePermissionEntity(perm);
			}
		}
		group.permissions = [];

		if (permissions.connection.accessLevel !== AccessLevelEnum.none) {
			const connPerm = new PermissionEntity();
			connPerm.type = PermissionTypeEnum.Connection;
			connPerm.accessLevel = permissions.connection.accessLevel;
			const saved = await this.globalDbContext.permissionRepository.saveNewOrUpdatedPermission(connPerm);
			group.permissions.push(saved);
		}

		if (permissions.group.accessLevel !== AccessLevelEnum.none) {
			const groupPerm = new PermissionEntity();
			groupPerm.type = PermissionTypeEnum.Group;
			groupPerm.accessLevel = permissions.group.accessLevel;
			const saved = await this.globalDbContext.permissionRepository.saveNewOrUpdatedPermission(groupPerm);
			group.permissions.push(saved);
		}

		for (const table of permissions.tables) {
			const access = table.accessLevel;
			if (access.visibility) {
				const perm = new PermissionEntity();
				perm.type = PermissionTypeEnum.Table;
				perm.accessLevel = AccessLevelEnum.visibility;
				perm.tableName = table.tableName;
				const saved = await this.globalDbContext.permissionRepository.saveNewOrUpdatedPermission(perm);
				group.permissions.push(saved);
			}
			if (access.readonly) {
				const perm = new PermissionEntity();
				perm.type = PermissionTypeEnum.Table;
				perm.accessLevel = AccessLevelEnum.readonly;
				perm.tableName = table.tableName;
				const saved = await this.globalDbContext.permissionRepository.saveNewOrUpdatedPermission(perm);
				group.permissions.push(saved);
			}
			if (access.add) {
				const perm = new PermissionEntity();
				perm.type = PermissionTypeEnum.Table;
				perm.accessLevel = AccessLevelEnum.add;
				perm.tableName = table.tableName;
				const saved = await this.globalDbContext.permissionRepository.saveNewOrUpdatedPermission(perm);
				group.permissions.push(saved);
			}
			if (access.edit) {
				const perm = new PermissionEntity();
				perm.type = PermissionTypeEnum.Table;
				perm.accessLevel = AccessLevelEnum.edit;
				perm.tableName = table.tableName;
				const saved = await this.globalDbContext.permissionRepository.saveNewOrUpdatedPermission(perm);
				group.permissions.push(saved);
			}
			if (access.delete) {
				const perm = new PermissionEntity();
				perm.type = PermissionTypeEnum.Table;
				perm.accessLevel = AccessLevelEnum.delete;
				perm.tableName = table.tableName;
				const saved = await this.globalDbContext.permissionRepository.saveNewOrUpdatedPermission(perm);
				group.permissions.push(saved);
			}
		}

		await this.globalDbContext.groupRepository.saveNewOrUpdatedGroup(group);
	}
}
