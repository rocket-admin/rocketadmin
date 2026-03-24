import { ForeignKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key.ds.js';
import { ForeignKeyWithAutocompleteColumnsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key-with-autocomplete-columns.ds.js';
import { IDataAccessObject } from '@rocketadmin/shared-code/dist/src/shared/interfaces/data-access-object.interface.js';
import { IDataAccessObjectAgent } from '@rocketadmin/shared-code/dist/src/shared/interfaces/data-access-object-agent.interface.js';

export async function attachForeignColumnNames(
	foreignKey: ForeignKeyDS,
	userEmail: string,
	connectionId: string,
	dao: IDataAccessObject | IDataAccessObjectAgent,
	findTableSettings: (
		connectionId: string,
		tableName: string,
	) => Promise<{ autocomplete_columns?: Array<string> } | null>,
): Promise<ForeignKeyWithAutocompleteColumnsDS> {
	try {
		const [foreignTableSettings, foreignTableStructure] = await Promise.all([
			findTableSettings(connectionId, foreignKey.referenced_table_name),
			dao.getTableStructure(foreignKey.referenced_table_name, userEmail),
		]);

		let columnNames = foreignTableStructure.map((el) => el.column_name);
		if (foreignTableSettings?.autocomplete_columns?.length > 0) {
			columnNames = columnNames.filter((el) => foreignTableSettings.autocomplete_columns.includes(el));
		}

		return {
			...foreignKey,
			autocomplete_columns: columnNames,
		};
	} catch (_e) {
		return {
			...foreignKey,
			autocomplete_columns: [],
		};
	}
}
