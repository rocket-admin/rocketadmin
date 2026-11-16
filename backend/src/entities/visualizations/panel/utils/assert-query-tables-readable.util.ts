import { ForbiddenException } from '@nestjs/common';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { slackPostMessage } from '../../../../helpers/slack/slack-post-message.js';
import { collectQueryTables } from './collect-query-tables.util.js';

interface AssertQueryTablesReadableParams {
	query: string;
	connectionType: ConnectionTypesEnum;
	connectionId: string;
	/** Resolves to the subset of the given tables the user is allowed to read (table:read). */
	getReadableTables: (tableNames: Array<string>) => Promise<Set<string>>;
	/** Lists every table in the connection; used for the all-tables fallback check. */
	listAllTableNames: () => Promise<Array<string>>;
}

/**
 * Guards a raw read-only query against table-level read permissions: the user must have read access
 * to every table the query touches.
 *
 * The exact set of tables can stay unresolved: a non-SQL connection, a parse failure, or a statement
 * that resolves to no concrete table. Then we cannot trust the query to be harmless. So we fall back
 * and require read permission on EVERY table in the connection. Thus a user can never read data
 * from a table without permission through this endpoint. Users with full read access can still
 * run such queries.
 */
export async function assertUserCanReadQueryTables(params: AssertQueryTablesReadableParams): Promise<void> {
	const { query, connectionType, connectionId, getReadableTables, listAllTableNames } = params;

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

	// One batched permission check. The all-tables fallback can cover dozens of tables. A
	// per-table check would load the user's groups once for each of them.
	const uniqueTables = Array.from(new Set(tablesToCheck));
	if (uniqueTables.length === 0) return;

	const readableTables = await getReadableTables(uniqueTables);
	const blockedTable = uniqueTables.find((tableName) => !readableTables.has(tableName));
	if (blockedTable !== undefined) {
		throw new ForbiddenException(Messages.NO_READ_PERMISSION_FOR_TABLE(blockedTable));
	}
}
