import { HttpException, HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseType } from '../../common/data-injection.tokens.js';
import { Messages } from '../../exceptions/text/messages.js';
import { Cacher } from '../../helpers/cache/cacher.js';
import { GroupEntity } from '../group/group.entity.js';
import { groupCustomRepositoryExtension } from '../group/repository/group-custom-repository-extension.js';
import { IGroupRepository } from '../group/repository/group.repository.interface.js';
import { UserEntity } from '../user/user.entity.js';
import {
	CedarAction,
	CedarResourceType,
	CedarValidationRequest,
	CEDAR_ACTION_TYPE,
	CEDAR_USER_TYPE,
} from './cedar-action-map.js';
import { ICedarAuthorizationService } from './cedar-authorization.service.interface.js';
import { buildCedarEntities } from './cedar-entity-builder.js';
import { CEDAR_SCHEMA } from './cedar-schema.js';

@Injectable()
export class CedarAuthorizationService implements ICedarAuthorizationService, OnModuleInit {
	private cedarModule: typeof import('@cedar-policy/cedar-wasm/nodejs');
	private schema: Record<string, unknown>;
	private groupRepository: IGroupRepository;
	private readonly logger = new Logger(CedarAuthorizationService.name);

	constructor(
		@Inject(BaseType.DATA_SOURCE)
		private readonly dataSource: DataSource,
	) {}

	async onModuleInit(): Promise<void> {
		if (!this.isFeatureEnabled()) return;
		this.cedarModule = await import('@cedar-policy/cedar-wasm/nodejs');
		this.schema = CEDAR_SCHEMA as Record<string, unknown>;
		this.groupRepository = this.dataSource.getRepository(GroupEntity).extend(groupCustomRepositoryExtension);
		this.logger.log('Cedar authorization service initialized');
	}

	isFeatureEnabled(): boolean {
		return process.env.CEDAR_AUTHORIZATION_ENABLED === 'true';
	}

	async validate(request: CedarValidationRequest): Promise<boolean> {
		const { userId, action, groupId, tableName } = request;
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
			default:
				return false;
		}

		return this.evaluate(userId, connectionId, action, resourceType, resourceId, tableName);
	}

	invalidatePolicyCacheForConnection(connectionId: string): void {
		Cacher.invalidateCedarPolicyCache(connectionId);
	}

	private async evaluate(
		userId: string,
		connectionId: string,
		action: CedarAction,
		resourceType: CedarResourceType,
		resourceId: string,
		tableName?: string,
	): Promise<boolean> {
		await this.assertUserNotSuspended(userId);

		const userGroups = await this.groupRepository.findAllUserGroupsInConnection(connectionId, userId);
		if (userGroups.length === 0) return false;

		const policies = await this.loadPoliciesForConnection(connectionId);
		if (!policies) return false;

		const entities = buildCedarEntities(userId, userGroups, connectionId, tableName);

		const call = {
			principal: { type: CEDAR_USER_TYPE, id: userId },
			action: { type: CEDAR_ACTION_TYPE, id: action },
			resource: { type: resourceType as string, id: resourceId },
			context: {},
			policies: { staticPolicies: policies },
			entities: entities,
			schema: this.schema,
		};

		const result = this.cedarModule.isAuthorized(call as Parameters<typeof this.cedarModule.isAuthorized>[0]);
		if (result.type === 'success') {
			return result.response.decision === 'allow';
		}

		this.logger.warn(`Cedar authorization error: ${JSON.stringify(result.errors)}`);
		return false;
	}

	private async loadPoliciesForConnection(connectionId: string): Promise<string | null> {
		const cached = Cacher.getCedarPolicyCache(connectionId);
		if (cached !== null) return cached;

		const groups = await this.groupRepository.findAllGroupsInConnection(connectionId);
		const policyTexts = groups.map((g) => g.cedarPolicy).filter(Boolean);

		if (policyTexts.length === 0) return null;

		const combined = policyTexts.join('\n\n');
		Cacher.setCedarPolicyCache(connectionId, combined);
		return combined;
	}

	private async assertUserNotSuspended(userId: string): Promise<void> {
		const user = await this.dataSource.getRepository(UserEntity).findOne({
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
		const group = await this.dataSource
			.getRepository(GroupEntity)
			.createQueryBuilder('group')
			.leftJoinAndSelect('group.connection', 'connection')
			.where('group.id = :groupId', { groupId })
			.getOne();
		return group?.connection?.id ?? null;
	}
}
