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
    sensitive_fields: string[]
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

export interface CustomAction {
    id?: string,
    title: string,
    type: CustomActionType,
    url: string,
    tableName: string,
    icon: string,
    requireConfirmation: boolean
}