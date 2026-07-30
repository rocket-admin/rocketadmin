import { ForbiddenException, Inject, Injectable, Logger, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { CedarAction } from '../../../entities/cedar-authorization/cedar-action-map.js';
import { CedarAuthorizationService } from '../../../entities/cedar-authorization/cedar-authorization.service.js';
import { IPublicTablePermission } from '../../../entities/cedar-authorization/cedar-policy-generator.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { SetPublicPermissionsDs } from '../data-structures/agents.ds.js';
import { PublicPermissionsRO } from '../data-structures/agents-responses.ds.js';
import { ISetPublicPermissions } from './agents-use-cases.interface.js';

// Grants public (anonymous) read access on connection tables on behalf of the website-generation
// agent (agents-core `set_public_read_permissions`, ADR sitenova/03 §6.4). agents-core has already
// collected the explicit user approval; this side re-checks that the approving user actually holds
// Cedar connection:edit, then MERGES the requested tables into the existing public policy (merge by
// default — the agent can only ever ADD public tables, never remove an admin's; `replace` exists
// for explicit resets). savePublicPermissions re-validates the generated policy and invalidates
// the policy cache, so the grant is effective immediately.

// Union two public-table sets: an all-columns grant (absent/empty readableColumns) on either side
// wins for that table; otherwise the column whitelists are unioned.
export function mergePublicTables(
	existing: Array<IPublicTablePermission>,
	requested: Array<IPublicTablePermission>,
): Array<IPublicTablePermission> {
	const merged = new Map<string, IPublicTablePermission>();
	for (const table of [...existing, ...requested]) {
		if (!table.tableName) continue;
		const previous = merged.get(table.tableName);
		if (!previous) {
			merged.set(table.tableName, {
				tableName: table.tableName,
				...(table.readableColumns?.length ? { readableColumns: [...table.readableColumns] } : {}),
			});
			continue;
		}
		if (!previous.readableColumns?.length || !table.readableColumns?.length) {
			merged.set(table.tableName, { tableName: table.tableName });
			continue;
		}
		merged.set(table.tableName, {
			tableName: table.tableName,
			readableColumns: [...new Set([...previous.readableColumns, ...table.readableColumns])],
		});
	}
	return [...merged.values()];
}

@Injectable({ scope: Scope.REQUEST })
export class SetPublicPermissionsUseCase
	extends AbstractUseCase<SetPublicPermissionsDs, PublicPermissionsRO>
	implements ISetPublicPermissions
{
	private readonly logger = new Logger(SetPublicPermissionsUseCase.name);

	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly cedarAuthService: CedarAuthorizationService,
	) {
		super();
	}

	protected async implementation(inputData: SetPublicPermissionsDs): Promise<PublicPermissionsRO> {
		const { userId, connectionId, tables, mode } = inputData;
		const requestedNames = tables.map((t) => t.tableName).join(', ');

		const allowed = await this.cedarAuthService.validate({
			userId,
			action: CedarAction.ConnectionEdit,
			connectionId,
		});
		if (!allowed) {
			// Audit trail: this is the most security-relevant refusal on the endpoint — the approving
			// user does not hold connection:edit, so the agent-collected approval is not honored.
			this.logger.warn(
				`Public-read grant REFUSED (no connection:edit): connection=${connectionId} user=${userId} requested=[${requestedNames}]`,
			);
			throw new ForbiddenException(Messages.DONT_HAVE_PERMISSIONS);
		}

		let effective: Array<IPublicTablePermission> = tables;
		if (mode !== 'replace') {
			const existing = await this.cedarAuthService.getPublicPermissions(connectionId);
			effective = mergePublicTables(existing.tables, tables);
		}

		const saved = await this.cedarAuthService.savePublicPermissions(connectionId, effective);
		// Audit trail for every grant (this endpoint changes what ANONYMOUS visitors can read).
		this.logger.log(
			`Public-read grant: connection=${connectionId} user=${userId} mode=${mode} requested=[${requestedNames}] ` +
				`-> enabled=${saved.enabled} tables=[${saved.tables.map((t) => t.tableName).join(', ')}]`,
		);
		return { enabled: saved.enabled, tables: saved.tables };
	}
}
