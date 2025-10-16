export interface TablePermissions {
    visibility: boolean,
    readonly: boolean,
    add: boolean,
    delete: boolean,
    edit: boolean
}

export interface TableProperties {
    table: string,
    display_name?: string,
    normalizedTableName?: string,
    permissions: TablePermissions,
}

export enum TableOrdering {
    Ascending = 'ASC',
    Descending = 'DESC'
}

export interface TableSettings {
    connection_id: string,
    table_name: string,
    icon: string,
    display_name: string,
    autocomplete_columns: string[],
    identity_column: string,
    search_fields: string[],
    excluded_fields: string[],
    list_fields: string[],
    ordering: TableOrdering,
    ordering_field: string,
    readonly_fields: string[],
    sortable_by: string[],
    columns_view: string[],
    sensitive_fields: string[],
    allow_csv_export: boolean,
    allow_csv_import: boolean,
    can_delete: boolean,
}

export interface TableRow {
    connectionID: string,
    tableName: string,
    record: object,
    columnsOrder: string[],
    primaryKeys: object,
    foreignKeys: TableForeignKey[],
    foreignKeysList: string[],
    widgets: Widget[],
    widgetsList: string[],
    fieldsTypes: { [key: string]: string },
    relatedRecords: {
        referenced_on_column_name: string,
		referenced_by: []
    }[],
    link?: string
}

export interface TableField {
    column_name: string,
    column_default: string,
    data_type: string,
    data_type_params?: string[],
    isExcluded: boolean,
    isSearched: boolean,
    allow_null: boolean,
    auto_increment: boolean,
    character_maximum_length: number
}

export interface TableForeignKey {
    autocomplete_columns?: string[],
    column_name: string,
    constraint_name: string,
    referenced_column_name: string,
    referenced_table_name: string,
    column_default?: string,
}

export interface WidgetStructure {
    field_name: string,
    widget_type: string,
    widget_params: Record<string, any>,
    name: string,
    description: string
}

export interface Widget {
    field_name: string,
    widget_type: string,
    widget_params: string,
    name: string,
    description: string
}

export enum CustomActionType {
    Single = "single",
    Multiple = "multiple"
}

export enum CustomActionMethod {
    Slack = "slack",
    Email = "email",
    URL = "URL",
    Zapier = "zapier"
}

export interface CustomAction {
    method: CustomActionMethod,
    emails: string[],
    url: string,
}

export enum EventType {
    AddRow = "ADD_ROW",
    UpdateRow = "UPDATE_ROW",
    DeleteRow = "DELETE_ROW",
    Custom = "CUSTOM"
}

export interface Event {
    event: EventType,
}

export interface CustomEvent {
    id?: string,
    event: EventType,
    title: string,
    type: CustomActionType,
    icon: string,
    require_confirmation: boolean
}

export interface Rule {
    id?: string,
    title: string,
    table_name: string,
    events: (Event | CustomEvent)[],
    table_actions: CustomAction[]
};