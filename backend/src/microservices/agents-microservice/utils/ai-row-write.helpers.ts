import { ForbiddenException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrimaryKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/primary-key.ds.js';
import { TableSettingsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-settings.ds.js';
import { TableStructureDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-structure.ds.js';
import { buildDAOsTableSettingsDs } from '@rocketadmin/shared-code/dist/src/helpers/data-structures-builders/table-settings.ds.builder.js';
import { IDataAccessObject } from '@rocketadmin/shared-code/dist/src/shared/interfaces/data-access-object.interface.js';
import { IDataAccessObjectAgent } from '@rocketadmin/shared-code/dist/src/shared/interfaces/data-access-object-agent.interface.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { CedarAction } from '../../../entities/cedar-authorization/cedar-action-map.js';
import { CedarAuthorizationService } from '../../../entities/cedar-authorization/cedar-authorization.service.js';
import { buildCommonTableSettingsInput } from '../../../entities/table/utils/build-common-table-settings-input.util.js';
import { convertHexDataInPrimaryKeyUtil } from '../../../entities/table/utils/convert-hex-data-in-primary-key.util.js';
import { TableWidgetEntity } from '../../../entities/widget/table-widget.entity.js';
import { TableNotFoundException } from '../../../exceptions/custom-exceptions/table-not-found-exception.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { compareArrayElements } from '../../../helpers/compare-array-elements.js';

// Shared steps of the three AI row-write use cases (sitenova plan 85). The chat data agent writes
// rows on behalf of a RocketAdmin user, so each write gets the checks the admin panel's own row
// routes apply: the table-level Cedar action, the table existence, the view rule, and the
// per-table `can_add` / `can_update` / `can_delete` settings.

const logger = new Logger('AgentsAiRowWrite');

export type AiRowWriteOperation = 'add' | 'update' | 'delete';

const CEDAR_ACTION_FOR_OPERATION: Record<AiRowWriteOperation, CedarAction> = {
	add: CedarAction.TableAdd,
	update: CedarAction.TableEdit,
	delete: CedarAction.TableDelete,
};

export type AiTableWriteContext = {
	tableStructure: Array<TableStructureDS>;
	primaryColumns: Array<PrimaryKeyDS>;
	primaryColumnNames: Array<string>;
	tableWidgets: Array<TableWidgetEntity>;
	daoTableSettings: TableSettingsDS;
};

// The same Cedar check the panel's TableAddGuard / TableEditGuard / TableDeleteGuard make. A
// refusal is logged, because the agent reported the user as the actor of the write.
export async function assertUserCanWriteTable(
	cedarAuthService: CedarAuthorizationService,
	operation: AiRowWriteOperation,
	userId: string,
	connectionId: string,
	tableName: string,
): Promise<void> {
	const allowed = await cedarAuthService.validate({
		userId,
		action: CEDAR_ACTION_FOR_OPERATION[operation],
		connectionId,
		tableName,
	});
	if (!allowed) {
		logger.warn(
			`AI row ${operation} REFUSED for user ${userId} on connection ${connectionId}: no permission for table "${tableName}"`,
		);
		throw new ForbiddenException(Messages.DONT_HAVE_PERMISSIONS);
	}
}

// Loads what a write needs and applies the table rules. Throws the same exceptions the panel's
// row use cases throw, so the agent reads the same messages a RocketAdmin user would see.
export async function prepareAiTableWrite(
	dbContext: IGlobalDatabaseContext,
	dao: IDataAccessObject | IDataAccessObjectAgent,
	connectionId: string,
	tableName: string,
	userEmail: string,
	operation: AiRowWriteOperation,
): Promise<AiTableWriteContext> {
	const tablesInConnection = await dao.getTablesFromDB(userEmail);
	if (!tablesInConnection.some((table) => table.tableName === tableName)) {
		throw new TableNotFoundException();
	}
	if (await dao.isView(tableName, userEmail)) {
		throw new HttpException({ message: Messages.CANT_UPDATE_TABLE_VIEW }, HttpStatus.BAD_REQUEST);
	}
	const [tableStructure, primaryColumns, tableSettings, tableWidgets] = await Promise.all([
		dao.getTableStructure(tableName, userEmail),
		dao.getTablePrimaryColumns(tableName, userEmail),
		dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName),
		dbContext.tableWidgetsRepository.findTableWidgets(connectionId, tableName),
	]);
	const operationAllowedBySettings =
		!tableSettings ||
		(operation === 'add' && tableSettings.can_add) ||
		(operation === 'update' && tableSettings.can_update) ||
		(operation === 'delete' && tableSettings.can_delete);
	if (!operationAllowedBySettings) {
		throw new HttpException({ message: Messages.CANT_DO_TABLE_OPERATION }, HttpStatus.FORBIDDEN);
	}
	return {
		tableStructure,
		primaryColumns,
		primaryColumnNames: primaryColumns.map((column) => column.column_name),
		tableWidgets,
		daoTableSettings: buildDAOsTableSettingsDs(buildCommonTableSettingsInput(tableSettings), null),
	};
}

// Every key must name exactly the table's primary columns. Binary key values arrive as hex and
// become buffers here, as on the panel's row routes.
export function normalizeAiPrimaryKeys(
	primaryKeys: Array<Record<string, unknown>>,
	context: AiTableWriteContext,
): Array<Record<string, unknown>> {
	if (context.primaryColumnNames.length === 0) {
		throw new HttpException({ message: Messages.PRIMARY_KEY_INVALID }, HttpStatus.BAD_REQUEST);
	}
	return primaryKeys.map((primaryKey) => {
		const converted = convertHexDataInPrimaryKeyUtil({ ...primaryKey }, context.tableStructure);
		for (const key of Object.keys(converted)) {
			// eslint-disable-next-line security/detect-object-injection
			if (converted[key] === undefined) delete converted[key];
		}
		if (!compareArrayElements(context.primaryColumnNames, Object.keys(converted))) {
			throw new HttpException({ message: Messages.PRIMARY_KEY_INVALID }, HttpStatus.BAD_REQUEST);
		}
		return converted;
	});
}

export function primaryKeyIndexKey(row: Record<string, unknown>, primaryColumnNames: Array<string>): string {
	// eslint-disable-next-line security/detect-object-injection
	return primaryColumnNames.map((column) => String(row[column])).join('\u0000');
}

// Reads the rows behind the keys (the audit log's "old data") and refuses the whole call when a
// key names no row, so a write never silently skips a row the agent reported as changed.
export async function loadRowsForAiPrimaryKeys(
	dao: IDataAccessObject | IDataAccessObjectAgent,
	tableName: string,
	primaryKeys: Array<Record<string, unknown>>,
	context: AiTableWriteContext,
	userEmail: string,
): Promise<Map<string, Record<string, unknown>>> {
	const rows = await dao.bulkGetRowsFromTableByPrimaryKeys(tableName, primaryKeys, context.daoTableSettings, userEmail);
	const rowsByKey = new Map<string, Record<string, unknown>>();
	for (const row of rows) {
		rowsByKey.set(primaryKeyIndexKey(row, context.primaryColumnNames), row);
	}
	const missing = primaryKeys.find(
		(primaryKey) => !rowsByKey.has(primaryKeyIndexKey(primaryKey, context.primaryColumnNames)),
	);
	if (missing) {
		throw new HttpException(
			{ message: `${Messages.ROW_PRIMARY_KEY_NOT_FOUND}: ${JSON.stringify(missing)}` },
			HttpStatus.BAD_REQUEST,
		);
	}
	return rowsByKey;
}
