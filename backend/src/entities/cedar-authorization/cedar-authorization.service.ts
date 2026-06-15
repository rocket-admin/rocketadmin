import * as cedarWasm from '@cedar-policy/cedar-wasm/nodejs';
import { HttpException, HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IGlobalDatabaseContext } from '../../common/application/global-database-context.interface.js';
import { BaseType } from '../../common/data-injection.tokens.js';
import { Messages } from '../../exceptions/text/messages.js';
import { Cacher } from '../../helpers/cache/cacher.js';
import { getErrorMessage } from '../../helpers/get-error-message.js';
import { GroupEntity } from '../group/group.entity.js';
import { IComplexPermission } from '../permission/permission.interface.js';
import {
	CEDAR_ACTION_TYPE,
	CEDAR_USER_TYPE,
	CedarAction,
	CedarResourceType,
	CedarValidationRequest,
	PUBLIC_USER_ID,
} from './cedar-action-map.js';
import { ICedarAuthorizationService } from './cedar-authorization.service.interface.js';
import { buildCedarEntities } from './cedar-entity-builder.js';
import { generatePublicCedarPolicy, IPublicTablePermission } from './cedar-policy-generator.js';
import { parseCedarPolicyToClassicalPermissions } from './cedar-policy-parser.js';
import { CEDAR_SCHEMA } from './cedar-schema.js';

@Injectable()
export class CedarAuthorizationService implements ICedarAuthorizationService, OnModuleInit {
	private schema: Record<string, unknown>;
	private readonly logger = new Logger(CedarAuthorizationService.name);

	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		private readonly globalDbContext: IGlobalDatabaseContext,
	) {}

	async onModuleInit(): Promise<void> {
		this.schema = CEDAR_SCHEMA as Record<string, unknown>;
		this.logger.log('Cedar authorization service initialized');
	}

	async validate(request: CedarValidationRequest): Promise<boolean> {
		if (request.publicAccess) {
			return this.validatePublic(request);
		}

		const { userId, action, groupId, tableName, columnName, dashboardId, panelId, actionEventId } = request;
		let { connectionId } = request;

		const actionPrefix = action.split(':')[0];
		let resourceType: CedarResourceType;
		let resourceId: string;

		switch (actionPrefix) {
			case 'connection':
				if (!connectionId) return false;
				resourceType = CedarResourceType.Connection;
				resourceId = connectionId;
				break;
			case 'group':
				if (!groupId) return false;
				resourceType = CedarResourceType.Group;
				connectionId = (await this.getConnectionIdForGroup(groupId)) ?? undefined;
				if (!connectionId) return false;
				resourceId = groupId;
				break;
			case 'table':
				if (!connectionId) return false;
				resourceType = CedarResourceType.Table;
				resourceId = `${connectionId}/${tableName}`;
				if (action === CedarAction.TableQuery) {
					// table:read is an alias for table:query + column:read(*). Honor legacy or
					// hand-written policies that grant table:read directly as a QueryTable grant.
					if (await this.evaluate(userId, connectionId, CedarAction.TableQuery, resourceType, resourceId, tableName)) {
						return true;
					}
					return this.evaluate(userId, connectionId, CedarAction.TableRead, resourceType, resourceId, tableName);
				}
				break;
			case 'column': {
				if (!connectionId) return false;
				if (!tableName || !columnName) return false;
				resourceType = CedarResourceType.Column;
				resourceId = `${connectionId}/${tableName}/${columnName}`;
				if (
					await this.evaluate(
						userId,
						connectionId,
						action,
						resourceType,
						resourceId,
						tableName,
						undefined,
						undefined,
						undefined,
						columnName,
					)
				) {
					return true;
				}
				// Legacy alias: a direct table:read grant covers every column of the table.
				return this.evaluate(
					userId,
					connectionId,
					CedarAction.TableRead,
					CedarResourceType.Table,
					`${connectionId}/${tableName}`,
					tableName,
				);
			}
			case 'actionEvent': {
				if (!connectionId) return false;
				if (!tableName || !actionEventId) return false;
				resourceType = CedarResourceType.ActionEvent;
				resourceId = `${connectionId}/${tableName}/${actionEventId}`;
				return this.evaluate(
					userId,
					connectionId,
					action,
					resourceType,
					resourceId,
					tableName,
					undefined,
					undefined,
					actionEventId,
				);
			}
			case 'dashboard': {
				if (!connectionId) return false;
				resourceType = CedarResourceType.Dashboard;
				const needsSentinel = action === CedarAction.DashboardCreate || !dashboardId;
				const effectiveDashboardId = needsSentinel ? '__new__' : dashboardId;
				resourceId = `${connectionId}/${effectiveDashboardId}`;
				return this.evaluate(
					userId,
					connectionId,
					action,
					resourceType,
					resourceId,
					tableName,
					effectiveDashboardId,
					undefined,
				);
			}
			case 'panel': {
				if (!connectionId) return false;
				resourceType = CedarResourceType.Panel;
				const needsSentinel = action === CedarAction.PanelCreate || !panelId;
				const effectivePanelId = needsSentinel ? '__new__' : panelId;
				resourceId = `${connectionId}/${effectivePanelId}`;
				return this.evaluate(
					userId,
					connectionId,
					action,
					resourceType,
					resourceId,
					tableName,
					undefined,
					effectivePanelId,
				);
			}
			default:
				return false;
		}

		if (!connectionId) return false;
		return this.evaluate(userId, connectionId, action, resourceType, resourceId, tableName, dashboardId, undefined);
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

		const group = await this.globalDbContext.groupRepository.findGroupByIdWithConnectionAndUsers(groupId);
		if (!group) {
			throw new HttpException({ message: Messages.GROUP_NOT_FOUND }, HttpStatus.BAD_REQUEST);
		}

		if (group.connection?.id !== connectionId) {
			throw new HttpException({ message: Messages.GROUP_NOT_FROM_THIS_CONNECTION }, HttpStatus.BAD_REQUEST);
		}

		if (group.isMain) {
			throw new HttpException({ message: Messages.CANNOT_CHANGE_ADMIN_GROUP }, HttpStatus.BAD_REQUEST);
		}

		await this.validatePolicyReferences(cedarPolicy, connectionId);

		const classicalPermissions = parseCedarPolicyToClassicalPermissions(cedarPolicy, connectionId, groupId);

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
				entities: [] as unknown[],
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
			throw new HttpException({ message: `Invalid cedar schema: ${getErrorMessage(e)}` }, HttpStatus.BAD_REQUEST);
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
		panelId?: string,
		actionEventId?: string,
		columnName?: string,
	): Promise<boolean> {
		await this.assertUserNotSuspended(userId);

		const userGroups = await this.globalDbContext.groupRepository.findAllUserGroupsInConnection(connectionId, userId);
		if (userGroups.length === 0) return false;

		const groupPolicies = this.loadPoliciesPerGroup(userGroups);
		if (groupPolicies.length === 0) return false;

		const entities = buildCedarEntities(
			userId,
			userGroups,
			connectionId,
			tableName,
			dashboardId,
			panelId,
			actionEventId,
			columnName,
		);

		return this.isAllowedByPolicies(groupPolicies, userId, action, resourceType, resourceId, entities);
	}

	private isAllowedByPolicies(
		policies: string[],
		userId: string,
		action: CedarAction,
		resourceType: CedarResourceType,
		resourceId: string,
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
			if (result.type === 'success') {
				if (result.response.decision === 'allow') {
					return true;
				}
			} else {
				this.logger.warn(`Cedar authorization error for policy: ${JSON.stringify(result.errors)}`);
			}
		}

		return false;
	}

	// Evaluates the connection's public policy (unauthenticated access). Public access only ever
	// grants QueryTable + ColumnRead, so any other action is denied outright.
	private async validatePublic(request: CedarValidationRequest): Promise<boolean> {
		const { action, tableName, columnName } = request;
		const { connectionId } = request;
		if (!connectionId) return false;

		const publicPolicy = await this.loadPublicPolicy(connectionId);
		if (!publicPolicy) return false;
		const policies = [publicPolicy];

		switch (action) {
			case CedarAction.TableQuery:
			case CedarAction.TableRead: {
				if (!tableName) return false;
				const entities = buildCedarEntities(PUBLIC_USER_ID, [], connectionId, tableName);
				return this.isAllowedByPolicies(
					policies,
					PUBLIC_USER_ID,
					CedarAction.TableQuery,
					CedarResourceType.Table,
					`${connectionId}/${tableName}`,
					entities,
				);
			}
			case CedarAction.ColumnRead: {
				if (!tableName || !columnName) return false;
				const entities = buildCedarEntities(
					PUBLIC_USER_ID,
					[],
					connectionId,
					tableName,
					undefined,
					undefined,
					undefined,
					columnName,
				);
				return this.isAllowedByPolicies(
					policies,
					PUBLIC_USER_ID,
					CedarAction.ColumnRead,
					CedarResourceType.Column,
					`${connectionId}/${tableName}/${columnName}`,
					entities,
				);
			}
			default:
				return false;
		}
	}

	async isPublicAccessEnabled(connectionId: string): Promise<boolean> {
		return (await this.loadPublicPolicy(connectionId)) !== null;
	}

	async getPublicPermissions(
		connectionId: string,
	): Promise<{ enabled: boolean; tables: Array<IPublicTablePermission> }> {
		const policy = await this.loadPublicPolicy(connectionId);
		if (!policy) {
			return { enabled: false, tables: [] };
		}
		const parsed = parseCedarPolicyToClassicalPermissions(policy, connectionId, '');
		const tables = parsed.tables.map((table) => ({
			tableName: table.tableName,
			readableColumns: table.readableColumns,
		}));
		return { enabled: true, tables };
	}

	async savePublicPermissions(
		connectionId: string,
		tables: Array<IPublicTablePermission>,
	): Promise<{ enabled: boolean; publicCedarPolicy: string | null; tables: Array<IPublicTablePermission> }> {
		const policy = generatePublicCedarPolicy(connectionId, tables);
		const hasPolicy = policy.trim().length > 0;
		if (hasPolicy) {
			this.validateCedarPolicyText(policy);
			await this.validatePolicyReferences(policy, connectionId);
			this.validatePublicPolicyActions(policy);
		}
		const storedPolicy = hasPolicy ? policy : null;
		await this.globalDbContext.connectionRepository.updateConnectionPublicCedarPolicy(connectionId, storedPolicy);
		Cacher.invalidateCedarPolicyCache(connectionId);
		return { enabled: hasPolicy, publicCedarPolicy: storedPolicy, tables: hasPolicy ? tables : [] };
	}

	// Caches the connection's public policy under the existing cedar policy cache (keyed by the
	// public sentinel principal). An empty string is cached to mean "no public access".
	private async loadPublicPolicy(connectionId: string): Promise<string | null> {
		const cached = Cacher.getCedarPolicyCache(connectionId, PUBLIC_USER_ID);
		if (cached !== null) {
			return cached.trim().length > 0 ? cached : null;
		}
		const policy = await this.globalDbContext.connectionRepository.getConnectionPublicCedarPolicy(connectionId);
		Cacher.setCedarPolicyCache(connectionId, PUBLIC_USER_ID, policy ?? '');
		return policy && policy.trim().length > 0 ? policy : null;
	}

	private validatePublicPolicyActions(policyText: string): void {
		// An unconstrained action (`permit(principal, action, resource)`) would grant everything.
		if (/,\s*action\s*,/.test(policyText)) {
			throw new HttpException({ message: Messages.PUBLIC_POLICY_ACTION_NOT_ALLOWED }, HttpStatus.BAD_REQUEST);
		}
		const allowed = new Set<string>([CedarAction.TableQuery, CedarAction.ColumnRead]);
		const actions = [...policyText.matchAll(/action\s*==\s*RocketAdmin::Action::"([^"]+)"/g)].map((m) => m[1]);
		for (const action of actions) {
			if (!allowed.has(action)) {
				throw new HttpException({ message: Messages.PUBLIC_POLICY_ACTION_NOT_ALLOWED }, HttpStatus.BAD_REQUEST);
			}
		}
	}

	private loadPoliciesPerGroup(userGroups: Array<GroupEntity>): string[] {
		return userGroups.map((g) => g.cedarPolicy).filter((policy): policy is string => Boolean(policy));
	}

	private async assertUserNotSuspended(userId: string): Promise<void> {
		const user = await this.globalDbContext.userRepository.findOne({
			where: { id: userId },
			select: { id: true, suspended: true },
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
				entities: [] as unknown[],
				schema: this.schema,
			};
			cedarWasm.isAuthorized(testCall as Parameters<typeof cedarWasm.isAuthorized>[0]);
		} catch (e) {
			throw new HttpException({ message: `Invalid cedar policy: ${getErrorMessage(e)}` }, HttpStatus.BAD_REQUEST);
		}
	}

	private async validatePolicyReferences(cedarPolicy: string, connectionId: string): Promise<void> {
		const connectionIds = [...cedarPolicy.matchAll(/resource\s*==\s*RocketAdmin::Connection::"([^"]+)"/g)].map(
			(m) => m[1],
		);

		for (const refConnectionId of connectionIds) {
			if (refConnectionId !== connectionId) {
				throw new HttpException(
					{ message: Messages.CEDAR_POLICY_REFERENCES_FOREIGN_CONNECTION },
					HttpStatus.BAD_REQUEST,
				);
			}
		}

		const groupResourceIds = [...cedarPolicy.matchAll(/resource\s*==\s*RocketAdmin::Group::"([^"]+)"/g)].map(
			(m) => m[1],
		);

		if (groupResourceIds.length > 0) {
			const connectionGroups = await this.globalDbContext.groupRepository.findAllGroupsInConnection(connectionId);
			const connectionGroupIds = new Set(connectionGroups.map((g) => g.id));

			for (const refGroupId of groupResourceIds) {
				if (!connectionGroupIds.has(refGroupId)) {
					throw new HttpException({ message: Messages.CEDAR_POLICY_REFERENCES_FOREIGN_GROUP }, HttpStatus.BAD_REQUEST);
				}
			}
		}

		const tableResourceIds = [...cedarPolicy.matchAll(/resource\s*==\s*RocketAdmin::Table::"([^"]+)"/g)].map(
			(m) => m[1],
		);

		for (const tableRef of tableResourceIds) {
			if (!tableRef.startsWith(`${connectionId}/`)) {
				throw new HttpException(
					{ message: Messages.CEDAR_POLICY_REFERENCES_FOREIGN_CONNECTION },
					HttpStatus.BAD_REQUEST,
				);
			}
		}

		const columnResourceIds = [...cedarPolicy.matchAll(/resource\s*(?:==|in)\s*RocketAdmin::Column::"([^"]+)"/g)].map(
			(m) => m[1],
		);

		for (const columnRef of columnResourceIds) {
			if (!columnRef.startsWith(`${connectionId}/`)) {
				throw new HttpException(
					{ message: Messages.CEDAR_POLICY_REFERENCES_FOREIGN_CONNECTION },
					HttpStatus.BAD_REQUEST,
				);
			}
		}

		const dashboardResourceIds = [...cedarPolicy.matchAll(/resource\s*==\s*RocketAdmin::Dashboard::"([^"]+)"/g)].map(
			(m) => m[1],
		);

		for (const dashboardRef of dashboardResourceIds) {
			if (!dashboardRef.startsWith(`${connectionId}/`)) {
				throw new HttpException(
					{ message: Messages.CEDAR_POLICY_REFERENCES_FOREIGN_CONNECTION },
					HttpStatus.BAD_REQUEST,
				);
			}
		}

		const panelResourceIds = [...cedarPolicy.matchAll(/resource\s*==\s*RocketAdmin::Panel::"([^"]+)"/g)].map(
			(m) => m[1],
		);

		for (const panelRef of panelResourceIds) {
			if (!panelRef.startsWith(`${connectionId}/`)) {
				throw new HttpException(
					{ message: Messages.CEDAR_POLICY_REFERENCES_FOREIGN_CONNECTION },
					HttpStatus.BAD_REQUEST,
				);
			}
		}
	}
}
