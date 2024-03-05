Description of interface methods, what should be realized in every data access object for integration Rocketadmin project with database.

### `addRowInTable(tableName: string, row: Record<string, unknown>): Promise<Record<string, unknown> | number>`

The `addRowInTable` method is an asynchronous function that adds a new row to a specified table.

#### Parameters:

- `tableName` (`string`): The name of the table where the new row will be added.
- `row` (`Record<string, unknown>`): An object representing the new row to be added. The keys of the object represent the column names, and the values represent the corresponding cell values.

#### Returns:

- `Promise<Record<string, unknown> | number>`: A Promise that resolves to either a `Record<string, unknown>` or a `number`. If the operation is successful, it returns the primary key of added row as a `Record<string, unknown>` or all added row as a`Record<string, unknown>`. The keys of the object represent the column names, and the values represent the corresponding cell values. If none of these options are feasible, the number of affected rows is returned as a number. However, is's recommend using this approach only in cases where inserted data cannot be retrieved.

### `getIdentityColumns(tableName: string, referencedFieldName: string, identityColumnName: string, fieldValues: Array<string | number>): Promise<Array<string>>`

The `getIdentityColumns` method is an asynchronous function that retrieves the values of columns from the table referenced by our current table.

#### Parameters:

- `tableName` (`string`): The name of the table from which the identity columns will be retrieved (table are referenced by foreign keys from our "working" table).
- `referencedFieldName` (`string`): The name of the field that is referenced when retrieving the identity columns.
- `identityColumnName` (`string`): The name of the identity column to be retrieved (we can specify an additional identity column in table settings).
- `fieldValues` (`Array<string | number>`): An array of values corresponding to the `referencedFieldName`. The method will retrieve the identity columns for the rows where the `referencedFieldName` matches any of the values in this array.

#### Returns:

- `Promise<Array<Record<string, unknown>>>`: A Promise that resolves to either a `Record<string, unknown>`. The keys of the object represent the column names, and the values represent the corresponding cell values.

### `getRowByPrimaryKey(tableName: string, primaryKey: Record<string, unknown>, settings: TableSettingsDS): Promise<Record<string, unknown>>`

The `getRowByPrimaryKey` method is an asynchronous function that retrieves a row from a specified table based on the primary key.

#### Parameters:

- `tableName` (`string`): The name of the table from which the row will be retrieved.
- `primaryKey` (`Record<string, unknown>`): An object representing the primary key of the row to be retrieved. The keys of the object represent the column names of the primary key, and the values represent the corresponding cell values.
- `settings` ([`TableSettingsDS`](#tablesettingsds)): An object representing the settings for the table.

#### Returns:

- `Promise<Record<string, unknown>>`: A Promise that resolves to a `Record<string, unknown>`. This object represents the row that was retrieved. The keys of the object represent the column names, and the values represent the corresponding cell values.

### `getRowsFromTable(tableName: string, settings: TableSettingsDS, page: number, perPage: number, searchedFieldValue: string, filteringFields: Array<FilteringFieldsDS>, autocompleteFields: AutocompleteFieldsDS): Promise<FoundRowsDS>`

The `getRowsFromTable` method is an asynchronous function that retrieves a set of rows from a specified table based on various parameters.

#### Parameters:

- `tableName` (`string`): The name of the table from which the rows will be retrieved.
- `settings` ([TableSettingsDS`](#tablesettingsds)): An object representing the settings for the table.
- `page` (`number`): The page number of the results to retrieve. This is used in conjunction with `perPage` to implement pagination.
- `perPage` (`number`): The number of results to retrieve per page. This is used in conjunction with `page` to implement pagination.
- `searchedFieldValue` (`string`): A string representing the value to search for in the table.
- `filteringFields` (Array of [`FilteringFieldsDS`](#filteringfieldsds)): An array of objects representing the fields to filter by.
- `autocompleteFields` ([AutocompleteFieldsDS`](#autocompletefieldsds)): An object representing the fields to autocomplete.

#### Returns:

- `Promise` of ([`FoundRowsDS`](#foundrowsds)): A Promise that resolves to an object of type [`FoundRowsDS`](#foundrowsds). This object represents the rows that were found based on the provided parameters.

### `getTableForeignKeys(tableName: string): Promise<Array<ForeignKeyDS>>`

The `getTableForeignKeys` method is an asynchronous function that retrieves the foreign keys of a specified table.

#### Parameters:

- `tableName` (`string`): The name of the table from which the foreign keys will be retrieved.

#### Returns:

- `Promise` (Array of [`ForeignKeyDS`](#foreignkeyds)): A Promise that resolves to an array of [`ForeignKeyDS`](#foreignkeyds) objects. Each [`ForeignKeyDS`](#foreignkeyds) object represents a foreign key in the table.

### `getTablePrimaryColumns(tableName: string): Promise<Array<PrimaryKeyDS>>`

The `getTablePrimaryColumns` method is an asynchronous function that retrieves the primary key columns of a specified table.

#### Parameters:

- `tableName` (`string`): The name of the table from which the primary key columns will be retrieved.

#### Returns:

- `Promise` (Array of [`PrimaryKeyDS`](#primarykeyds)): A Promise that resolves to an array of [`PrimaryKeyDS`](#primarykeyds) objects. Each [`PrimaryKeyDS`](#primarykeyds) object represents a primary key column in the table.

### `getTablesFromDB(): Promise<Array<TableDS>>`

The `getTablesFromDB` method is an asynchronous function that retrieves all tables from the database.

#### Parameters:

This method does not take any parameters.

#### Returns:

- `Promise` (Array of [`TableDS`](#tableds)): A Promise that resolves to an array of [`TableDS`](#tableds) objects. Each [`TableDS`](#tableds) object represents a table in the database.

### `getTableStructure(tableName: string): Promise<Array<TableStructureDS>>`

The `getTableStructure` method is an asynchronous function that retrieves the structure of a specified table.

#### Parameters:

- `tableName` (`string`): The name of the table for which the structure will be retrieved.

#### Returns:

- `Promise` (Array of [`TableStructureDS`](#tablestructureds)): A Promise that resolves to an array of [`TableStructureDS`](#tablestructureds) objects. Each [`TableStructureDS`](#tablestructureds) object represents a column in the table, including details such as the column name, data type, and whether it is part of the primary key.

### `testConnect(): Promise<TestConnectionResultDS>`

The `testConnect` method is an asynchronous function that tests the connection to the database.

#### Parameters:

This method does not take any parameters.

#### Returns:

- `Promise` of ([`TestConnectionResultDS`](#testconnectionresultds)): A Promise that resolves to a `TestConnectionResultDS` object. This object represents the result of the connection test.

### `updateRowInTable(tableName: string, row: Record<string, unknown>, primaryKey: Record<string, unknown>): Promise<Record<string, unknown>>`

The `updateRowInTable` method is an asynchronous function that updates a row in a specified table.

#### Parameters:

- `tableName` (`string`): The name of the table in which the row will be updated.
- `row` (`Record<string, unknown>`): An object representing the new data for the row. The keys of the object represent the column names, and the values represent the new cell values.
- `primaryKey` (`Record<string, unknown>`): An object representing the primary key of the row to be updated. The keys of the object represent the column names of the primary key, and the values represent the corresponding cell values.

#### Returns:

- `Promise<Record<string, unknown>>`: A Promise that resolves to a `Record<string, unknown>`. This object represents the updated rows primary key. If there are no primary keys in table - it returns the full updated row. The keys of the object represent the column names, and the values represent the corresponding cell values.

### `bulkUpdateRowsInTable(tableName: string, newValues: Record<string, unknown>, primaryKeys: Array<Record<string, unknown>>): Promise<Record<string, unknown>>`

The `bulkUpdateRowsInTable` method is an asynchronous function that updates multiple rows in a specified table.

#### Parameters:

- `tableName` (`string`): The name of the table in which the rows will be updated.
- `newValues` (`Record<string, unknown>`): An object representing the new data for the rows. The keys of the object represent the column names, and the values represent the new cell values.
- `primaryKeys` (`Array<Record<string, unknown>>`): An array of objects, each representing the primary key of a row to be updated. The keys of each object represent the column names of the primary key, and the values represent the corresponding cell values.

#### Returns:

- `Promise<Record<string, unknown>>`: A Promise that resolves to a `Record<string, unknown>`. This object represents the updated rows primary keys. If there are no primary keys in table - it returns the full updated rows The keys of the object represent the column names, and the values represent the corresponding cell values.

### `validateSettings(settings: ValidateTableSettingsDS, tableName: string): Promise<Array<string>>`

The `validateSettings` method is an asynchronous function that validates the settings for a specified table.

#### Parameters:

- `settings` ([`ValidateTableSettingsDS`](#validatetablesettingsds)): An object representing the settings to be validated for the table.
- `tableName` (`string`): The name of the table for which the settings will be validated.

#### Returns:

- `Promise<Array<string>>`: A Promise that resolves to an array of strings. Each string in the array represents an error message for a validation failure. If the settings are valid, the array will be empty.

### `getReferencedTableNamesAndColumns(tableName: string): Promise<Array<ReferencedTableNamesAndColumnsDS>>`

The `getReferencedTableNamesAndColumns` method is an asynchronous function that retrieves the names and columns of all tables that are referenced by a specified table.

#### Parameters:

- `tableName` (`string`): The name of the table for which the referenced table names and columns will be retrieved.

#### Returns:

- `Promise` Array of ([`ReferencedTableNamesAndColumnsDS`](#referencedtablenamesandcolumnsds)): A Promise that resolves to an array of [`ReferencedTableNamesAndColumnsDS`](#referencedtablenamesandcolumnsds) objects. Each [`ReferencedTableNamesAndColumnsDS`](#referencedtablenamesandcolumnsds) object represents a table and its columns that is referenced on the specified table primary keys, including the names and columns of the referenced table.

### `isView(tableName: string): Promise<boolean>`

The `isView` method is an asynchronous function that checks if a specified table is a view.

#### Parameters:

- `tableName` (`string`): The name of the table to check.

#### Returns:

- `Promise<boolean>`: A Promise that resolves to a boolean. The boolean value is `true` if the specified table is a view, and `false` otherwise.

### `getTableRowsStream(tableName: string, settings: TableSettingsDS, page: number, perPage: number, searchedFieldValue: string, filteringFields: Array<FilteringFieldsDS>): Promise<Stream & AsyncIterable<any>>`

The `getTableRowsStream` method is an asynchronous function that retrieves a stream of rows from a specified table, with optional settings, pagination, search, and filtering.

#### Parameters:

- `tableName` (`string`): The name of the table from which the rows will be retrieved.
- `settings` ([`TableSettingsDS`](#tablesettingsds)): An object representing the settings for retrieving the rows.
- `page` (`number`): The page number for pagination.
- `perPage` (`number`): The number of rows per page for pagination.
- `searchedFieldValue` (`string`): A string value to search for in the table.
- `filteringFields` (Array of [`FilteringFieldsDS`](#filteringfieldsds)): An array of [`FilteringFieldsDS`](#filteringfieldsds) objects representing the fields to be used for filtering the rows.

#### Returns:

- `Promise<Stream & AsyncIterable<any>>`: A Promise that resolves to a stream of rows. Each row is represented as an object, where the keys are the column names and the values are the cell values. Used for exporting rows data as csv file.

### Data structures:

### `TableSettingsDS`

The `TableSettingsDS` class represents the settings for a table.

#### Properties:

- `table_name` (`string`): The name of the table.
- `display_name` (`string`): The display name of the table.
- `search_fields` (`Array<string>`): The fields that can be searched.
- `excluded_fields` (`Array<string>`): The fields that are excluded.
- `list_fields` (`Array<string>`): The fields that are listed.
- `identification_fields` (`Array<string>`): The fields used for identification.
- `list_per_page` (`number`): The number of items listed per page.
- `ordering` ([QueryOrderingEnum](#queryorderingenum)): The ordering of the items (either ascending or descending).
- `ordering_field` (`string`): The field used for ordering.
- `identity_column` (`string`): The identity column of the table.
- `readonly_fields` (`Array<string>`): The fields that are read-only.
- `sortable_by` (`Array<string>`): The fields that can be sorted.
- `autocomplete_columns` (`Array<string>`): The columns that have autocomplete enabled.
- `columns_view` (`Array<string>`): The columns that are visible.
- `can_delete` (`boolean`): Whether rows can be deleted.
- `can_update` (`boolean`): Whether rows can be updated.
- `can_add` (`boolean`): Whether new rows can be added.
- `sensitive_fields` (`Array<string>`): The fields that are sensitive and should be handled with extra care.

### `QueryOrderingEnum`

The `QueryOrderingEnum` is an enumeration representing the ordering of items in a query.

#### Values:

- `ASC`: Represents ascending order.
- `DESC`: Represents descending order.

### `FilteringFieldsDS`

The `FilteringFieldsDS` class represents a field to be used for filtering.

#### Properties:

- `field` (`string`): The name of the field to be used for filtering.
- `criteria` ([FilterCriteriaEnum](#filtercriteriaenum)): The criteria to be used for filtering. This should be one of the values from the `FilterCriteriaEnum`.
- `value` (`unknown`): The value to be used for filtering.

### `FilterCriteriaEnum`

The `FilterCriteriaEnum` is an enumeration representing the criteria that can be used for filtering.

#### Values:

- `startswith`: The field value should start with the specified value.
- `endswith`: The field value should end with the specified value.
- `gt`: The field value should be greater than the specified value.
- `lt`: The field value should be less than the specified value.
- `lte`: The field value should be less than or equal to the specified value.
- `gte`: The field value should be greater than or equal to the specified value.
- `contains`: The field value should contain the specified value.
- `icontains`: The field value should contain the specified value, case-insensitive.
- `eq`: The field value should be equal to the specified value.
- `empty`: The field value should be empty.

### `AutocompleteFieldsDS`

The `AutocompleteFieldsDS` class represents a set of fields to be used for autocomplete.

#### Properties:

- `fields` (`Array<string>`): An array of field names to be used for autocomplete.
- `value` (`unknown`): The value to be used for autocomplete.

### `FoundRowsDS`

The `FoundRowsDS` class represents the rows found after a search or filter operation.

#### Properties:

- `data` (`Array<Record<string, unknown>>`): An array of objects representing the rows found. Each object is a row, where the keys are the column names and the values are the cell values.
- `pagination` ([`RowsPaginationDS`](#rowspaginationds)): An object representing the pagination information for the rows.
- `large_dataset` (`boolean`): A flag indicating whether the dataset is large (more than 100000 rows).

### `RowsPaginationDS`

The `RowsPaginationDS` class represents the pagination information for a set of rows.

#### Properties:

- `total` (`number`): The total number of rows.
- `lastPage` (`number`): The number of the last page.
- `perPage` (`number`): The number of rows per page.
- `currentPage` (`number`): The current page number.

### `ForeignKeyDS`

The `ForeignKeyDS` class represents a foreign key in a table.

#### Properties:

- `referenced_column_name` (`string`): The name of the column in the referenced table that the foreign key points to.
- `referenced_table_name` (`string`): The name of the table that the foreign key points to.
- `constraint_name` (`string`): The name of the foreign key constraint.
- `column_name` (`string`): The name of the column in the current table that is part of the foreign key.

### `PrimaryKeyDS`

The `PrimaryKeyDS` class represents a primary key in a table.

#### Properties:

- `column_name` (`string`): The name of the column that is the primary key.
- `data_type` (`string`): The data type of the primary key column.

### `TableDS`

The `TableDS` class represents a table in a database.

#### Properties:

- `tableName` (`string`): The name of the table.
- `isView` (`boolean`): A flag indicating whether the table is a view.

### `TableStructureDS`

The `TableStructureDS` class represents the structure of a table in a database.

#### Properties:

- `allow_null` (`boolean`): A flag indicating whether the column allows null values.
- `character_maximum_length` (`number | null`): The maximum length of the character data type column. If the column is not of a character data type, this will be `null`.
- `column_default` (`string | null`): The default value of the column. If the column does not have a default value, this will be `null`.
- `column_name` (`string`): The name of the column.
- `data_type` (`string`): The data type of the column.
- `data_type_params` (`string`): The parameters of the data type of the column.
- `udt_name` (`string`): The name of the user-defined type of the column. If the column is of a built-in data type, this will be the same as `data_type`.
- `extra` (`string`, optional): Any extra information about the column.

### `TestConnectionResultDS`

The `TestConnectionResultDS` class represents the result of a test connection operation.

#### Properties:

- `result` (`boolean`): A flag indicating whether the test connection was successful.
- `message` (`string`): A message providing more information about the test connection result.

### `ValidateTableSettingsDS`

The `ValidateTableSettingsDS` class represents the settings for validating a table.

#### Properties:

- `table_name` (`string`): The name of the table.
- `display_name` (`string`): The display name of the table.
- `search_fields` (`Array<string>`): An array of field names to be used for searching.
- `excluded_fields` (`Array<string>`): An array of field names to be excluded from the table.
- `list_fields` (`Array<string>`): An array of field names to be displayed in the list view.
- `identification_fields` (`Array<string>`): An array of field names to be used for identification.
- `list_per_page` (`number`): The number of items to be displayed per page in the list view.
- `ordering` ([QueryOrderingEnum](#queryorderingenum)): The ordering of the items in the list view.
- `ordering_field` (`string`): The field to be used for ordering the items.
- `identity_column` (`string`): The column to be used as the identity column.
- `readonly_fields` (`Array<string>`): An array of field names to be marked as read-only.
- `sortable_by` (`Array<string>`): An array of field names that the list can be sorted by.
- `autocomplete_columns` (`Array<string>`): An array of field names to be used for autocomplete.
- `custom_fields` (`Array` of [CustomFieldDS](#customfieldds), optional): An array of custom fields.
- `table_widgets` (`Array` of [TableWidgetDS](#tablewidgetds), optional): An array of table widgets.
- `columns_view` (`Array<string>`, optional): An array of column names to be displayed in the columns view.
- `icon` (`string`, optional): The icon for the table.

### `CustomFieldDS`

The `CustomFieldDS` class represents a custom field in a table.

#### Properties:

- `type` (`string`): The type of the custom field.
- `template_string` (`string`): The template string of the custom field.
- `text` (`string`): The text of the custom field.

### `TableWidgetDS`

The `TableWidgetDS` class represents a widget in a table.

#### Properties:

- `id` (`string`): The ID of the widget.
- `field_name` (`string`): The name of the field associated with the widget.
- `widget_type` ([TableWidgetTypeEnum](#tablewidgettypeenum), optional): The type of the widget.
- `widget_params` (`string | null`): The parameters of the widget.
- `widget_options` (`string | null`): The options of the widget.
- `name` (`string | null`, optional): The name of the widget.
- `description` (`string | null`, optional): The description of the widget.

### `TableWidgetTypeEnum`

The `TableWidgetTypeEnum` enumeration represents the types of widgets that can be used in a table. Each widget type implies certain rules for processing or viewing the marked fields in the table.

#### Values:

- `Password`: Represents a password widget. Fields marked with this widget will be processed as password fields.
- `Boolean`: Represents a boolean widget. Fields marked with this widget will be processed as boolean fields.
- `Date`: Represents a date widget. Fields marked with this widget will be processed as date fields.
- `Time`: Represents a time widget. Fields marked with this widget will be processed as time fields.
- `DateTime`: Represents a date-time widget. Fields marked with this widget will be processed as date-time fields.
- `JSON`: Represents a JSON widget. Fields marked with this widget will be processed as JSON fields.
- `Textarea`: Represents a textarea widget. Fields marked with this widget will be processed as textarea fields.
- `String`: Represents a string widget. Fields marked with this widget will be processed as string fields.
- `Readonly`: Represents a readonly widget. Fields marked with this widget will be processed as readonly fields.
- `Number`: Represents a number widget. Fields marked with this widget will be processed as number fields.
- `Select`: Represents a select widget. Fields marked with this widget will be processed as select fields.
- `UUID`: Represents a UUID widget. Fields marked with this widget will be processed as UUID fields.
- `Enum`: Represents an enum widget. Fields marked with this widget will be processed as enum fields.
- `Foreign_key`: Represents a foreign key widget. Fields marked with this widget will be processed as foreign key fields.
- `File`: Represents a file widget. Fields marked with this widget will be processed as file fields.

### `ReferencedTableNamesAndColumnsDS`

The `ReferencedTableNamesAndColumnsDS` class represents the tables and columns that reference a particular column.

#### Properties:

- `referenced_by` (`Array<{ table_name: string; column_name: string }>`): An array of objects, each representing a table and a column within that table that references the column specified by `referenced_on_column_name`.
- `referenced_on_column_name` (`string`): The name of the column that is referenced by the tables and columns specified by `referenced_by`.
