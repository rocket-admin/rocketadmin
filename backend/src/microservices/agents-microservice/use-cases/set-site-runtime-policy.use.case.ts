import { ForbiddenException, HttpException, HttpStatus, Inject, Injectable, Logger, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { CedarAction } from '../../../entities/cedar-authorization/cedar-action-map.js';
import { CedarAuthorizationService } from '../../../entities/cedar-authorization/cedar-authorization.service.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { SetSiteRuntimePolicyDs } from '../data-structures/agents.ds.js';
import { SiteRuntimePolicyRO } from '../data-structures/agents-responses.ds.js';
import { ISetSiteRuntimePolicy } from './agents-use-cases.interface.js';

// Writes the site data contract (plan 13 §4) onto the connection — the manifest universal-backend
// enforces at the generated-site runtime (auth-table pinning, write allow-lists, owner-scoped
// reads). Same owner-consent channel as set-public-permissions: agents-core has already collected
// the explicit user approval; this side re-checks that the approving user actually holds Cedar
// connection:edit and logs refusals. Unlike the public grant there is no merge mode — the agent
// derives the complete manifest from the schema it created and it replaces the stored one
// wholesale (a backfilled presence-only marker included).
@Injectable({ scope: Scope.REQUEST })
export class SetSiteRuntimePolicyUseCase
	extends AbstractUseCase<SetSiteRuntimePolicyDs, SiteRuntimePolicyRO>
	implements ISetSiteRuntimePolicy
{
	private readonly logger = new Logger(SetSiteRuntimePolicyUseCase.name);

	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly cedarAuthService: CedarAuthorizationService,
	) {
		super();
	}

	protected async implementation(inputData: SetSiteRuntimePolicyDs): Promise<SiteRuntimePolicyRO> {
		const { userId, connectionId, policy } = inputData;

		// The DTO already requires an object; arrays satisfy @IsObject, so rule them out here —
		// a jsonb array would make universal-backend's parser treat every section as absent.
		if (typeof policy !== 'object' || policy === null || Array.isArray(policy)) {
			throw new HttpException({ message: Messages.SITE_RUNTIME_POLICY_INVALID }, HttpStatus.BAD_REQUEST);
		}

		const allowed = await this.cedarAuthService.validate({
			userId,
			action: CedarAction.ConnectionEdit,
			connectionId,
		});
		if (!allowed) {
			// Audit trail: the approving user does not hold connection:edit, so the agent-collected
			// approval is not honored (mirror of the set-public-permissions refusal).
			this.logger.warn(
				`Site-runtime-policy write REFUSED (no connection:edit): connection=${connectionId} user=${userId}`,
			);
			throw new ForbiddenException(Messages.DONT_HAVE_PERMISSIONS);
		}

		await this._dbContext.connectionRepository.updateConnectionSiteRuntimePolicy(connectionId, policy);
		// Audit trail for every write: this manifest decides what site visitors can do at runtime.
		const authTable = (policy.auth as Record<string, unknown> | undefined)?.tableName ?? null;
		const writeTables = Array.isArray(policy.write)
			? policy.write.map((entry: { table?: string }) => entry?.table).filter(Boolean)
			: [];
		this.logger.log(
			`Site-runtime-policy written: connection=${connectionId} user=${userId} ` +
				`authTable=${authTable} writeTables=[${writeTables.join(', ')}]`,
		);
		return { policy };
	}
}
