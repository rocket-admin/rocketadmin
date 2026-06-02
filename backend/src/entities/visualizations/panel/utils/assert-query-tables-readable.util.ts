import { ForbiddenException } from '@nestjs/common';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { slackPostMessage } from '../../../../helpers/slack/slack-post-message.js';
import { collectQueryTables } from './collect-query-tables.util.js';

interface AssertQueryTablesReadableParams {
	query: string;
	connectionType: ConnectionTypesEnum;
	connectionId: string;
	/** Resolves to `true` when the user is allowed to read the given table (table:read). */
	validateTableRead: (tableName: string) => Promise<boolean>;
	/** Lists every table in the connection; used for the all-tables fallback check. */
	listAllTableNames: () => Promise<Array<string>>;
}

/**
 * Guards a raw read-only query against table-level read permissions: the user must have read access
 * to every table the query touches.
 *
 * When the exact set of tables cannot be resolved (non-SQL connection, parse failure, or a statement
 * that resolves to no concrete table), we cannot trust the query to be harmless, so we fall back to
 * requiring read permission on EVERY table in the connection. This guarantees a user can never read
 * data from a table they lack permission on through this endpoint, while still letting users with
 * full read access run such queries.
 */
export async function assertUserCanReadQueryTables(params: AssertQueryTablesReadableParams): Promise<void> {
	const { query, connectionType, connectionId, validateTableRead, listAllTableNames } = params;

	const collected = collectQueryTables(query, connectionType);

	let tablesToCheck: Array<string>;
	if (collected.kind === 'tables') {
		tablesToCheck = collected.tables;
	} else {
		slackPostMessage(
			`Saved-query permission check could not resolve referenced tables for connection ${connectionId} ` +
				`(reason: ${collected.reason}); falling back to all-tables read check. Query: ${query}`,
		);
		tablesToCheck = await listAllTableNames();
	}

	for (const tableName of tablesToCheck) {
		const allowed = await validateTableRead(tableName);
		if (!allowed) {
			throw new ForbiddenException(Messages.NO_READ_PERMISSION_FOR_TABLE(tableName));
		}
	}
}
