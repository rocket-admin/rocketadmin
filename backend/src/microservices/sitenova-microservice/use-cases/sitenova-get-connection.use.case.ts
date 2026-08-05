import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { validateConnection } from '../../../entities/table/utils/validate-connection.util.js';
import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';
import { SitenovaGetConnectionDs } from '../data-structures/sitenova.ds.js';
import { SitenovaConnectionForSiteRuntimeRO } from '../data-structures/sitenova-internal-responses.ds.js';
import { SitenovaEndUserAuthService } from '../services/sitenova-enduser-auth.service.js';
import { ISitenovaGetConnection } from './sitenova-use-cases.interface.js';

@Injectable()
export class SitenovaGetConnectionUseCase
	extends AbstractUseCase<SitenovaGetConnectionDs, SitenovaConnectionForSiteRuntimeRO>
	implements ISitenovaGetConnection
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly endUserAuthService: SitenovaEndUserAuthService,
	) {
		super();
	}

	protected async implementation(inputData: SitenovaGetConnectionDs): Promise<SitenovaConnectionForSiteRuntimeRO> {
		const { connectionId } = inputData;

		const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, '');
		validateConnection(connection);

		// Agent connections store no credentials on the core (queries run inside the customer
		// network); the universal-backend service cannot open them with the returned config.
		if (isConnectionTypeAgent(connection.type)) {
			throw new BadRequestException('Agent connections have no stored credentials to hand out.');
		}

		const endUserJwtKey = await this.endUserAuthService.getEndUserSigningKey(connectionId);

		return {
			connection: {
				id: connection.id,
				type: connection.type as string,
				host: connection.host,
				port: connection.port ?? null,
				username: connection.username,
				password: connection.password,
				database: connection.database,
				schema: connection.schema,
				ssl: connection.ssl,
				cert: connection.cert,
				ssh: connection.ssh,
				azure_encryption: connection.azure_encryption,
				sid: connection.sid,
				authSource: connection.authSource,
				dataCenter: connection.dataCenter,
			},
			endUserJwtKey,
			// Rides the existing 60 s cache on universal-backend — no extra round trip. Null for any
			// connection that does not back a generated site (plan 13 Step 2a).
			siteRuntimePolicy: connection.site_runtime_policy ?? null,
		};
	}
}
