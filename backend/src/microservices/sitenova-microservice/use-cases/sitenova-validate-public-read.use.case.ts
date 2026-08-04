import { Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IDatabaseContext } from '../../../common/database-context.interface.js';
import { CedarAction, PUBLIC_USER_ID } from '../../../entities/cedar-authorization/cedar-action-map.js';
import { CedarAuthorizationService } from '../../../entities/cedar-authorization/cedar-authorization.service.js';
import { CedarPermissionsService } from '../../../entities/cedar-authorization/cedar-permissions.service.js';
import { SitenovaValidatePublicReadDs } from '../data-structures/sitenova.ds.js';
import { SitenovaPublicReadValidationRO } from '../data-structures/sitenova-internal-responses.ds.js';
import { ISitenovaValidatePublicRead } from './sitenova-use-cases.interface.js';

// Bridges SitenovaPublicReadGuard's Cedar evaluation (allowed?) and the public readable-columns
// projection to the universal-backend service, which runs the actual query itself but must apply
// the exact same public-read policy the core applies on its own /sitenova data routes.
@Injectable()
export class SitenovaValidatePublicReadUseCase
	extends AbstractUseCase<SitenovaValidatePublicReadDs, SitenovaPublicReadValidationRO>
	implements ISitenovaValidatePublicRead
{
	protected _dbContext: IDatabaseContext | null = null;

	constructor(
		private readonly cedarAuthService: CedarAuthorizationService,
		private readonly cedarPermissions: CedarPermissionsService,
	) {
		super();
	}

	protected async implementation(inputData: SitenovaValidatePublicReadDs): Promise<SitenovaPublicReadValidationRO> {
		const { connectionId, tableName, columnNames } = inputData;

		const publicEnabled = await this.cedarAuthService.isPublicAccessEnabled(connectionId);
		if (!publicEnabled) {
			return { allowed: false, readableColumns: null };
		}
		const allowed = await this.cedarAuthService.validate({
			userId: PUBLIC_USER_ID,
			action: CedarAction.TableQuery,
			connectionId,
			tableName,
			publicAccess: true,
		});
		if (!allowed) {
			return { allowed: false, readableColumns: null };
		}

		let readableColumns: Array<string> | null = null;
		if (columnNames && columnNames.length > 0) {
			const readable = await this.cedarPermissions.getReadableColumnsForPublic(connectionId, tableName, columnNames);
			readableColumns = columnNames.filter((columnName) => readable.has(columnName));
		}
		return { allowed: true, readableColumns };
	}
}
