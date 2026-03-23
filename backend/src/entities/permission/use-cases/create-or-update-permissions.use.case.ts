import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import {
	CreatePermissionsDs,
	PermissionsDs,
} from '../application/data-structures/create-permissions.ds.js';
import { generateCedarPolicyForGroup } from '../../cedar-authorization/cedar-policy-generator.js';
import { Cacher } from '../../../helpers/cache/cacher.js';
import { ICreateOrUpdatePermissions } from './permissions-use-cases.interface.js';

@Injectable()
export class CreateOrUpdatePermissionsUseCase
	extends AbstractUseCase<CreatePermissionsDs, PermissionsDs>
	implements ICreateOrUpdatePermissions
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: CreatePermissionsDs): Promise<PermissionsDs> {
		const {
			groupId,
			permissions: {
				connection: { connectionId },
			},
		} = inputData;
		const connectionWithThisGroup =
			await this._dbContext.connectionRepository.getConnectionByGroupIdWithCompanyAndUsersInCompany(groupId);
		if (connectionWithThisGroup?.id !== connectionId) {
			throw new HttpException(
				{
					message: Messages.GROUP_NOT_FROM_THIS_CONNECTION,
				},
				HttpStatus.BAD_REQUEST,
			);
		}
		const groupToUpdate = await this._dbContext.groupRepository.findGroupById(groupId);
		if (!groupToUpdate) {
			throw new HttpException(
				{
					message: Messages.GROUP_NOT_FOUND,
				},
				HttpStatus.BAD_REQUEST,
			);
		}
		if (groupToUpdate.isMain) {
			throw new HttpException(
				{
					message: Messages.CANNOT_CHANGE_ADMIN_GROUP,
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		const resultPermissions: PermissionsDs = {
			connection: {
				accessLevel: inputData.permissions.connection.accessLevel,
				connectionId: inputData.permissions.connection.connectionId,
			},
			group: {
				accessLevel: inputData.permissions.group.accessLevel,
				groupId: inputData.permissions.group.groupId,
			},
			tables: inputData.permissions.tables,
		};

		// Generate and save Cedar policy for this group
		const cedarPolicy = generateCedarPolicyForGroup(connectionId, groupToUpdate.isMain, resultPermissions);
		groupToUpdate.cedarPolicy = cedarPolicy;
		await this._dbContext.groupRepository.saveNewOrUpdatedGroup(groupToUpdate);
		Cacher.invalidateCedarPolicyCache(connectionId);

		return resultPermissions;
	}
}
