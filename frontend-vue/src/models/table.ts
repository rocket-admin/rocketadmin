export interface TablePermissions {
	visibility: boolean;
	readonly: boolean;
	add: boolean;
	delete: boolean;
	edit: boolean;
}

export interface TableProperties {
	table: string;
	display_name?: string;
	normalizedTableName?: string;
	initials?: string;
	icon?: string;
	permissions: TablePermissions;
	configured?: boolean;
	configuring?: boolean;
}

export enum TableOrdering {
	Ascending = 'ASC',
	Descending = 'DESC',
}

export interface TableSettings {
	connection_id: string;
	table_name: string;

	icon: string;
	display_name: string;
	autocomplete_columns: string[];
	identity_column: string;
	ordering: TableOrdering;
	ordering_field: string;
	list_fields: string[];
	columns_view: string[];
	search_fields: string[];
	excluded_fields: string[];
	readonly_fields: string[];
	sortable_by: string[];
	sensitive_fields: string[];
	allow_csv_export: boolean;
	allow_csv_import: boolean;
	can_delete: boolean;
}

export interface PersonalTableViewSettings {
	ordering?: TableOrdering;
	ordering_field?: string;
	list_per_page?: number;
	list_fields?: string[];
	columns_view?: string[];
	original_names?: boolean;

	// sortable_by: string[],
}

/** Where a row is referenced from — GET /table/row's `referenced_table_names_and_columns[0]`. */
export interface RelatedRecords {
	referenced_on_column_name: string;
	referenced_by: { table_name: string; column_name: string; display_name?: string }[];
}

/**
 * The row open in the table view's side panel (TableStateService.selectRow). Every field is null
 * while a foreign-key row is being fetched: the panel then shows its loading skeleton.
 */
export interface TableRow {
	connectionID: string | null;
	tableName: string | null;
	record: Record<string, unknown> | null;
	columnsOrder: string[] | null;
	primaryKeys: Record<string, unknown> | null;
	/** Keyed by column name. */
	foreignKeys: Record<string, TableForeignKey> | null;
	foreignKeysList: string[] | null;
	/** Keyed by column name, `widget_params` parsed. */
	widgets: Record<string, WidgetStructure> | null;
	widgetsList: string[] | null;
	fieldsTypes: { [key: string]: string } | null;
	relatedRecords: RelatedRecords | null;
	link?: string | null;
}

export interface TableField {
	column_name: string;
	column_default: string | null;
	data_type: string;
	data_type_params?: string[];
	isExcluded: boolean;
	isSearched: boolean;
	allow_null: boolean;
	auto_increment: boolean;
	character_maximum_length: number | null;
}

export interface TableForeignKey {
	autocomplete_columns?: string[];
	column_name: string;
	constraint_name: string;
	referenced_column_name: string;
	referenced_table_name: string;
	column_default?: string;
}

export interface WidgetStructure {
	field_name: string;
	widget_type: string;
	widget_params: Record<string, any>;
	name: string;
	description: string;
}

export interface Widget {
	field_name: string;
	widget_type: string;
	widget_params: string;
	name: string;
	description: string;
}

export enum CustomActionType {
	Single = 'single',
	Multiple = 'multiple',
}

export enum CustomActionMethod {
	Slack = 'slack',
	Email = 'email',
	URL = 'URL',
	Zapier = 'zapier',
}

export interface CustomAction {
	method: CustomActionMethod;
	emails: string[];
	url: string;
	/** The Slack webhook, for the actions page's Slack method. */
	slack_url?: string;
}

export enum EventType {
	AddRow = 'ADD_ROW',
	UpdateRow = 'UPDATE_ROW',
	DeleteRow = 'DELETE_ROW',
	Custom = 'CUSTOM',
}

export interface Event {
	event: EventType;
}

export interface CustomEvent {
	id?: string;
	event: EventType;
	title: string;
	type: CustomActionType;
	icon: string;
	require_confirmation: boolean;
}

export interface Rule {
	id?: string;
	title: string;
	table_name: string;
	events: (Event | CustomEvent)[];
	table_actions: CustomAction[];
}
