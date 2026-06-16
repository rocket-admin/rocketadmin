import { Inject, Injectable } from '@nestjs/common';
import { validateSchemaCache } from '@rocketadmin/shared-code/dist/src/caching/schema-cache-validator.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { FoundRowsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/found-rows.ds.js';
import { buildDAOsTableSettingsDs } from '@rocketadmin/shared-code/dist/src/helpers/data-structures-builders/table-settings.ds.builder.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { ExceptionOperations } from '../../../../exceptions/custom-exceptions/exception-operation.js';
import { TableNotFoundException } from '../../../../exceptions/custom-exceptions/table-not-found-exception.js';
import { UnknownSQLException } from '../../../../exceptions/custom-exceptions/unknown-sql-exception.js';
import { hexToBinary, isBinary } from '../../../../helpers/binary-to-hex.js';
import { getErrorMessage } from '../../../../helpers/get-error-message.js';
import { isObjectEmpty } from '../../../../helpers/is-object-empty.js';
import { CedarPermissionsService } from '../../../cedar-authorization/cedar-permissions.service.js';
import { TableSettingsEntity } from '../../../table-settings/common-table-settings/table-settings.entity.js';
import { FilteringFieldsDs } from '../../table-datastructures.js';
import { buildCommonTableSettingsInput } from '../../utils/build-common-table-settings-input.util.js';
import {
	filterRowsByReadableColumns,
	isAllColumnsReadable,
} from '../../utils/filter-columns-by-read-permission.util.js';
import { findFilteringFieldsUtil, parseFilteringFieldsFromBodyData } from '../../utils/find-filtering-fields.util.js';
import { findOrderingFieldUtil } from '../../utils/find-ordering-field.util.js';
import { isHexString } from '../../utils/is-hex-string.js';
import { processRowsUtil } from '../../utils/process-found-rows-util.js';
import { getUserEmailForAgent, validateConnection } from '../../utils/validate-connection.util.js';
import { PureFoundRowsResponseDs } from '../application/data-structures/pure-found-rows-response.ds.js';
import { PureGetRowsDs } from '../application/data-structures/pure-get-rows.ds.js';
import { IPureGetRowsFromTable } from './table-pure-crud-use-cases.interface.js';

@Injectable()
export class PureGetRowsFromTableUseCase
	extends AbstractUseCase<PureGetRowsDs, PureFoundRowsResponseDs>
	implements IPureGetRowsFromTable
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly cedarPermissions: CedarPermissionsService,
	) {
		super();
	}

	protected async implementation(inputData: PureGetRowsDs): Promise<PureFoundRowsResponseDs> {
		const { connectionId, masterPwd, page, perPage, query, tableName, userId, filters } = inputData;
		let { searchingFieldValue } = inputData;

		const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
		validateConnection(connection);

		const dao = getDataAccessObject(connection);
		const userEmail = await getUserEmailForAgent(connection, userId, this._dbContext.userRepository);

		const tablesInConnection = await dao.getTablesFromDB(userEmail);
		const tableNames = tablesInConnection.map((table) => table.tableName);
		if (!tableNames.includes(tableName)) {
			throw new TableNotFoundException();
		}

		await validateSchemaCache(dao, userEmail);

		const { tableSettings, tableCustomFields, tableWidgets } =
			await this._dbContext.tableSettingsRepository.findTableCustoms(connectionId, tableName);

		const tableStructure = await dao.getTableStructure(tableName, userEmail);

		const filteringFields: Array<FilteringFieldsDs> = isObjectEmpty(filters)
			? findFilteringFieldsUtil(query, tableStructure)
			: parseFilteringFieldsFromBodyData(filters ?? {}, tableStructure);
		const orderingField = findOrderingFieldUtil(query, tableStructure, tableSettings ?? ({} as TableSettingsEntity));

		const builtTableSettings = buildDAOsTableSettingsDs(buildCommonTableSettingsInput(tableSettings), null);
		if (orderingField) {
			builtTableSettings.ordering_field = orderingField.field;
			builtTableSettings.ordering = orderingField.value;
		}

		if (
			isHexString(searchingFieldValue) &&
			(tableStructure.some((field) => isBinary(field.data_type)) ||
				connection.type === ConnectionTypesEnum.mongodb ||
				connection.type === ConnectionTypesEnum.agent_mongodb)
		) {
			searchingFieldValue = hexToBinary(searchingFieldValue) as unknown as string;
			builtTableSettings.search_fields = tableStructure
				.filter((field) => isBinary(field.data_type))
				.map((field) => field.column_name);
			if (connection.type === ConnectionTypesEnum.mongodb || connection.type === ConnectionTypesEnum.agent_mongodb) {
				builtTableSettings.search_fields.push('_id');
			}
		}

		let rows: FoundRowsDS;
		try {
			rows = await dao.getRowsFromTable(
				tableName,
				builtTableSettings,
				page,
				perPage,
				searchingFieldValue,
				filteringFields,
				{ fields: [], value: '' },
				tableStructure,
				userEmail,
			);
		} catch (e) {
			throw new UnknownSQLException(getErrorMessage(e), ExceptionOperations.FAILED_TO_GET_ROWS_FROM_TABLE);
		}

		rows = processRowsUtil(rows, tableWidgets, tableCustomFields);

		const allColumnNames = tableStructure.map((column) => column.column_name);
		const readableColumns = userId
			? await this.cedarPermissions.getReadableColumns(userId, connectionId, tableName, allColumnNames)
			: await this.cedarPermissions.getReadableColumnsForPublic(connectionId, tableName, allColumnNames);
		if (!isAllColumnsReadable(readableColumns, allColumnNames)) {
			rows.data = filterRowsByReadableColumns(rows.data, readableColumns);
		}

		return {
			rows: rows.data,
			pagination: rows.pagination,
		};
	}
}
