Row list endpoint
=========================================

`GET /table/rows/:connection_id?tableName=:tableName`

Table rows endpoint returns keys:

* rows - array of rows from table. Each row is an object with key is a column name and value is a value of the column. Exception is foreign keys, where value is an object with primary key columns of the referenced table and identity column name. Example: `[{ id: 12345, title: "Random title", DomainId: { "id": 9456, "hostname": "rand.om" } }]`
* primaryColumns - List of primary keys of the table. Array of objects with keys `column_name` and `data_type`. Example: `[{"column_name": "id", "data_type": "int"}]`
* structure - List of columns of the table. Array of objects with keys `column_name`, `data_type`, `allow_null`, `character_maximum_length`, `isExcluded`, `isSearched`, `auto_increment`, `column_default`. Example: `[{"column_name": "id", "data_type": "int", "allow_null": false, "character_maximum_length": 11, "isExcluded": false, "isSearched": false, "auto_increment": true, "column_default": null}]`
* foreignKeys - List of foreign keys of the table. Array of objects with keys `referenced_column_name`, `referenced_table_name`, `constraint_name`, `column_name`, `autocomplete_columns`. Example: `[{"referenced_column_name": "id", "referenced_table_name": "Domains", "constraint_name": "MainPageTemplateDomain_ibfk_2", "column_name": "DomainId", "autocomplete_columns": ["id", "hostname", "title"]}]`
* widgets - List of widgets of the table.
* table_actions - List of table actions
* list_fields - List of fields to be displayed in the list. First 5 fields are displayed by default.
* identity_column - Name of the column that is used as identity column. Identity column is used to display the row in the list.
* sortable_by - List of columns that can be used to sort the list.
* pagination - Object with pagination information. Keys `total`, `lastPage`, `perPage`, `currentPage`.
* configured - Boolean value that indicates if the table is configured. It is used to display the configuration button in the list.