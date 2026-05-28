import { TableSettingsEntity } from '../../table-settings/common-table-settings/table-settings.entity.js';

export function emitSettingsMessages(setting: TableSettingsEntity, emit: (text: string) => void): void {
	const tableName = setting.table_name;
	const params: Array<[string, string]> = [];
	if (setting.display_name) {
		params.push(['display_name', `"${setting.display_name}"`]);
	}
	if (setting.search_fields && setting.search_fields.length > 0) {
		params.push(['search_fields', setting.search_fields.join(', ')]);
	}
	if (setting.readonly_fields && setting.readonly_fields.length > 0) {
		params.push(['readonly_fields', setting.readonly_fields.join(', ')]);
	}
	if (setting.columns_view && setting.columns_view.length > 0) {
		params.push(['columns_view', setting.columns_view.join(', ')]);
	}
	if (setting.ordering) {
		params.push(['ordering', String(setting.ordering)]);
	}
	if (setting.ordering_field) {
		params.push(['ordering_field', `"${setting.ordering_field}"`]);
	}
	if (setting.identity_column) {
		params.push(['identity_column', `"${setting.identity_column}"`]);
	}

	if (params.length === 0) {
		emit(`Set up settings for table "${tableName}" with default parameters`);
		return;
	}
	for (const [name, value] of params) {
		emit(`Set up settings for table "${tableName}", ${name} parameter set to ${value}`);
	}
}
