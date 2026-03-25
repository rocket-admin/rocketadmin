import { TableSettingsEntity } from '../../table-settings/common-table-settings/table-settings.entity.js';
import { ITableAndViewPermissionData } from '../../permission/permission.interface.js';
import { FoundTableDs } from '../application/data-structures/found-table.ds.js';

export function addDisplayNamesForTables(
	tableSettings: Array<TableSettingsEntity>,
	tablesObjArr: Array<ITableAndViewPermissionData>,
): Array<FoundTableDs> {
	return tablesObjArr.map((tableObj: ITableAndViewPermissionData) => {
		const foundTableSettings = tableSettings.find((el: TableSettingsEntity) => el.table_name === tableObj.tableName);
		const displayName = foundTableSettings ? foundTableSettings.display_name : undefined;
		const icon = foundTableSettings ? foundTableSettings.icon : undefined;
		return {
			table: tableObj.tableName,
			isView: tableObj.isView || false,
			permissions: tableObj.accessLevel,
			display_name: displayName,
			icon: icon,
		};
	});
}
