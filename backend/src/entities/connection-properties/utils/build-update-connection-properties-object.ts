import { CreateConnectionPropertiesDs } from '../application/data-structures/create-connection-properties.ds.js';

export function buildUpdateConnectionPropertiesObject(
	inputData: CreateConnectionPropertiesDs,
): IUpdateConnectionPropertiesObject {
	const {
		hidden_tables,
		logo_url,
		primary_color,
		secondary_color,
		hostname,
		company_name,
		tables_audit,
		human_readable_table_names,
		allow_ai_requests,
		default_showing_table,
	} = inputData;

	const result: IUpdateConnectionPropertiesObject = {};
	if (hidden_tables !== undefined) result.hidden_tables = hidden_tables;
	if (logo_url !== undefined) result.logo_url = logo_url;
	if (primary_color !== undefined) result.primary_color = primary_color;
	if (secondary_color !== undefined) result.secondary_color = secondary_color;
	if (hostname !== undefined) result.hostname = hostname;
	if (company_name !== undefined) result.company_name = company_name;
	if (tables_audit !== undefined) result.tables_audit = tables_audit;
	if (human_readable_table_names !== undefined) result.human_readable_table_names = human_readable_table_names;
	if (allow_ai_requests !== undefined) result.allow_ai_requests = allow_ai_requests;
	if (default_showing_table !== undefined) result.default_showing_table = default_showing_table;
	return result;
}

export interface IUpdateConnectionPropertiesObject {
	hidden_tables?: Array<string>;
	logo_url?: string;
	primary_color?: string;
	secondary_color?: string;
	hostname?: string;
	company_name?: string;
	tables_audit?: boolean;
	human_readable_table_names?: boolean;
	allow_ai_requests?: boolean;
	default_showing_table?: string;
}
