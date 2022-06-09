import { CreateTableSettingsDto } from '../../entities/table-settings/dto';
import { QueryOrderingEnum } from '../../enums';

export const TableSettingForTestConnections = {
  // create table settings dtos for mysql database

  big_users_table_settings_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'big_users_table';
    newTableSettingsDto.display_name = 'BIG users table';
    newTableSettingsDto.search_fields = ['first_name', 'second_name', 'city'];
    newTableSettingsDto.excluded_fields = ['updated_at'];
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 20;
    newTableSettingsDto.ordering = QueryOrderingEnum.ASC;
    newTableSettingsDto.ordering_field = 'id';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = ['email', 'id'];
    newTableSettingsDto.sortable_by = ['age', 'first_name', 'second_name', 'created_at'];
    newTableSettingsDto.autocomplete_columns = ['first_name', 'second_name'];
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = ['first_name', 'second_name', 'age', 'email', 'city', 'id', 'created_at'];
    return newTableSettingsDto;
  },

  bigger_users_table_settings_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'bigger_users_table';
    newTableSettingsDto.display_name = 'BIGGER users table';
    newTableSettingsDto.search_fields = ['first_name', 'second_name', 'city'];
    newTableSettingsDto.excluded_fields = ['updated_at'];
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 20;
    newTableSettingsDto.ordering = QueryOrderingEnum.ASC;
    newTableSettingsDto.ordering_field = 'id';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = ['email', 'id'];
    newTableSettingsDto.sortable_by = ['age', 'first_name', 'second_name', 'created_at'];
    newTableSettingsDto.autocomplete_columns = ['first_name', 'second_name'];
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = ['age', 'city', 'first_name', 'second_name', 'email', 'id', 'created_at'];
    return newTableSettingsDto;
  },

  Customers_mysql_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'Customers';
    newTableSettingsDto.display_name = undefined;
    newTableSettingsDto.search_fields = ['FirstName'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 25;
    newTableSettingsDto.ordering = QueryOrderingEnum.DESC;
    newTableSettingsDto.ordering_field = 'Id';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = ['Id'];
    newTableSettingsDto.sortable_by = ['FirstName'];
    newTableSettingsDto.autocomplete_columns = ['FirstName'];
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = undefined;
    return newTableSettingsDto;
  },

  group_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'group';
    newTableSettingsDto.display_name = 'Groups time';
    newTableSettingsDto.search_fields = ['groupName', 'day'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 30;
    newTableSettingsDto.ordering = QueryOrderingEnum.ASC;
    newTableSettingsDto.ordering_field = 'beggingTime';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = ['beggingTime'];
    newTableSettingsDto.sortable_by = ['groupName', 'day'];
    newTableSettingsDto.autocomplete_columns = undefined;
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = undefined;
    return newTableSettingsDto;
  },

  Orders_mysql_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'Orders';
    newTableSettingsDto.display_name = 'Created orders';
    newTableSettingsDto.search_fields = ['CustomerId', 'ProductId', 'status'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 24;
    newTableSettingsDto.ordering = QueryOrderingEnum.DESC;
    newTableSettingsDto.ordering_field = 'CreatedAt';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = undefined;
    newTableSettingsDto.sortable_by = ['Price', 'CustomerId', 'ProductId', 'ProductCount'];
    newTableSettingsDto.autocomplete_columns = undefined;
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = undefined;
    return newTableSettingsDto;
  },

  Products_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'Products';
    newTableSettingsDto.display_name = undefined;
    newTableSettingsDto.search_fields = ['ProductName', 'Manufacturer'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 60;
    newTableSettingsDto.ordering = QueryOrderingEnum.ASC;
    newTableSettingsDto.ordering_field = 'Price';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = undefined;
    newTableSettingsDto.sortable_by = ['Price', 'ProductCount', 'Id'];
    newTableSettingsDto.autocomplete_columns = undefined;
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = undefined;
    return newTableSettingsDto;
  },

  tutorial_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'tutorial';
    newTableSettingsDto.display_name = undefined;
    newTableSettingsDto.search_fields = undefined;
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 60;
    newTableSettingsDto.ordering = QueryOrderingEnum.DESC;
    newTableSettingsDto.ordering_field = 'maxMembers';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = undefined;
    newTableSettingsDto.sortable_by = ['maxMembers', 'minMembers'];
    newTableSettingsDto.autocomplete_columns = undefined;
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = undefined;
    return newTableSettingsDto;
  },

  users_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'users';
    newTableSettingsDto.display_name = 'Users Table';
    newTableSettingsDto.search_fields = ['FirstName', 'LastName', 'Email'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 10;
    newTableSettingsDto.ordering = QueryOrderingEnum.ASC;
    newTableSettingsDto.ordering_field = 'FirstName';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = undefined;
    newTableSettingsDto.sortable_by = ['FirstName', 'LastName', 'Age'];
    newTableSettingsDto.autocomplete_columns = undefined;
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = undefined;
    return newTableSettingsDto;
  },

  getMySQLTableSettingsDTOs: (connectionId: string): Array<CreateTableSettingsDto> => {
    const dtos = [];
    dtos.push(
      TableSettingForTestConnections.big_users_table_settings_dto(connectionId),
      TableSettingForTestConnections.bigger_users_table_settings_dto(connectionId),
      TableSettingForTestConnections.Customers_mysql_dto(connectionId),
      TableSettingForTestConnections.group_dto(connectionId),
      TableSettingForTestConnections.Orders_mysql_dto(connectionId),
      TableSettingForTestConnections.Products_dto(connectionId),
      TableSettingForTestConnections.tutorial_dto(connectionId),
      TableSettingForTestConnections.users_dto(connectionId),
    );
    return dtos;
  },

  // create table settings dtos for postgres database
  complex_pigs_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'complex_pigs';
    newTableSettingsDto.display_name = 'Pigs Table';
    newTableSettingsDto.search_fields = ['animalname', 'pig_farm_name'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 25;
    newTableSettingsDto.ordering = QueryOrderingEnum.DESC;
    newTableSettingsDto.ordering_field = 'weight';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = ['color'];
    newTableSettingsDto.sortable_by = ['weight', 'age', 'color'];
    newTableSettingsDto.autocomplete_columns = undefined;
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = undefined;
    return newTableSettingsDto;
  },

  addresses_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'addresses';
    newTableSettingsDto.display_name = 'Addresses Table';
    newTableSettingsDto.search_fields = ['City', 'Street'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 25;
    newTableSettingsDto.ordering = QueryOrderingEnum.DESC;
    newTableSettingsDto.ordering_field = 'Country';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = ['Zip Code'];
    newTableSettingsDto.sortable_by = ['Region', 'City', 'Zip Code'];
    newTableSettingsDto.autocomplete_columns = ['Country'];
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = undefined;
    return newTableSettingsDto;
  },

  customers_postgres_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'customers';
    newTableSettingsDto.display_name = undefined;
    newTableSettingsDto.search_fields = ['firstname'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 25;
    newTableSettingsDto.ordering = QueryOrderingEnum.DESC;
    newTableSettingsDto.ordering_field = 'id';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = ['id'];
    newTableSettingsDto.sortable_by = ['firstname'];
    newTableSettingsDto.autocomplete_columns = ['firstname'];
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = undefined;
    return newTableSettingsDto;
  },

  orders_postgres_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'orders';
    newTableSettingsDto.display_name = 'Created orders';
    newTableSettingsDto.search_fields = ['customerid', 'productid', 'price'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 24;
    newTableSettingsDto.ordering = QueryOrderingEnum.DESC;
    newTableSettingsDto.ordering_field = 'createdat';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = undefined;
    newTableSettingsDto.sortable_by = ['customerid', 'productid', 'price'];
    newTableSettingsDto.autocomplete_columns = undefined;
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = undefined;
    return newTableSettingsDto;
  },

  products_postgres_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'products';
    newTableSettingsDto.display_name = undefined;
    newTableSettingsDto.search_fields = ['productname', 'company', 'price'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 60;
    newTableSettingsDto.ordering = QueryOrderingEnum.ASC;
    newTableSettingsDto.ordering_field = 'price';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = undefined;
    newTableSettingsDto.sortable_by = ['price', 'productcount', 'id'];
    newTableSettingsDto.autocomplete_columns = undefined;
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = undefined;
    return newTableSettingsDto;
  },

  getPostgresSettingsDTOs: (connectionId: string): Array<CreateTableSettingsDto> => {
    const dtos = [];
    dtos.push(
      TableSettingForTestConnections.complex_pigs_dto(connectionId),
      TableSettingForTestConnections.addresses_dto(connectionId),
      TableSettingForTestConnections.customers_postgres_dto(connectionId),
      TableSettingForTestConnections.orders_postgres_dto(connectionId),
      TableSettingForTestConnections.products_postgres_dto(connectionId),
    );
    return dtos;
  },

  // create table settings dtos for Oracle database

  big_users_table_settings_oracle_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'BIG_USERS_TABLE';
    newTableSettingsDto.display_name = 'BIG users table';
    newTableSettingsDto.search_fields = ['FIRST_NAME', 'SECOND_NAME', 'CITY'];
    newTableSettingsDto.excluded_fields = ['UPDATED_AT'];
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 20;
    newTableSettingsDto.ordering = QueryOrderingEnum.ASC;
    newTableSettingsDto.ordering_field = 'ID';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = ['EMAIL', 'ID'];
    newTableSettingsDto.sortable_by = ['AGE', 'FIRST_NAME', 'SECOND_NAME', 'CREATED_AT'];
    newTableSettingsDto.autocomplete_columns = ['FIRST_NAME', 'SECOND_NAME'];
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = ['FIRST_NAME', 'SECOND_NAME', 'AGE', 'EMAIL', 'CITY', 'ID', 'CREATED_AT'];
    return newTableSettingsDto;
  },

  bigger_users_table_settings_oracle_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'BIGGER_USERS_TABLE';
    newTableSettingsDto.display_name = 'BIGGER users table';
    newTableSettingsDto.search_fields = ['FIRST_NAME', 'SECOND_NAME', 'CITY'];
    newTableSettingsDto.excluded_fields = ['UPDATED_AT'];
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 20;
    newTableSettingsDto.ordering = QueryOrderingEnum.ASC;
    newTableSettingsDto.ordering_field = 'ID';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = ['EMAIL', 'ID'];
    newTableSettingsDto.sortable_by = ['AGE', 'FIRST_NAME', 'SECOND_NAME', 'CREATED_AT'];
    newTableSettingsDto.autocomplete_columns = ['FIRST_NAME', 'SECOND_NAME'];
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = ['AGE', 'CITY', 'FIRST_NAME', 'SECOND_NAME', 'EMAIL', 'ID', 'CREATED_AT'];
    return newTableSettingsDto;
  },

  customers_oracle_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'CUSTOMERS';
    newTableSettingsDto.display_name = undefined;
    newTableSettingsDto.search_fields = ['FIRSTNAME'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 25;
    newTableSettingsDto.ordering = QueryOrderingEnum.DESC;
    newTableSettingsDto.ordering_field = 'ID';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = ['ID'];
    newTableSettingsDto.sortable_by = ['FIRSTNAME'];
    newTableSettingsDto.autocomplete_columns = ['FIRSTNAME'];
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = undefined;
    return newTableSettingsDto;
  },

  orders_oracle_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'ORDERS';
    newTableSettingsDto.display_name = 'Created orders';
    newTableSettingsDto.search_fields = ['CUSTOMERID', 'PRODUCTID', 'STATUS'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 24;
    newTableSettingsDto.ordering = QueryOrderingEnum.DESC;
    newTableSettingsDto.ordering_field = 'CREATEDAT';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = undefined;
    newTableSettingsDto.sortable_by = ['PRICE', 'CUSTOMERID', 'PRODUCTID', 'PRODUCTCOUNT'];
    newTableSettingsDto.autocomplete_columns = undefined;
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = undefined;
    return newTableSettingsDto;
  },

  products_oracle_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'PRODUCTS';
    newTableSettingsDto.display_name = undefined;
    newTableSettingsDto.search_fields = ['PRODUCTNAME', 'MANUFACTURER'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 60;
    newTableSettingsDto.ordering = QueryOrderingEnum.ASC;
    newTableSettingsDto.ordering_field = 'PRICE';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = undefined;
    newTableSettingsDto.sortable_by = ['PRICE', 'PRODUCTCOUNT', 'ID'];
    newTableSettingsDto.autocomplete_columns = undefined;
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = undefined;
    return newTableSettingsDto;
  },

  getOracleSettingsDTOs: (connectionId: string): Array<CreateTableSettingsDto> => {
    const dtos = [];
    dtos.push(
      TableSettingForTestConnections.big_users_table_settings_oracle_dto(connectionId),
      TableSettingForTestConnections.bigger_users_table_settings_oracle_dto(connectionId),
      TableSettingForTestConnections.customers_oracle_dto(connectionId),
      TableSettingForTestConnections.orders_oracle_dto(connectionId),
      TableSettingForTestConnections.products_oracle_dto(connectionId),
    );
    return dtos;
  },

  // create table settings dtos for MSSQL database

  big_users_table_mssql_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'big_users_table';
    newTableSettingsDto.display_name = 'BIG users table';
    newTableSettingsDto.search_fields = ['first_name', 'second_name', 'city'];
    newTableSettingsDto.excluded_fields = ['updated_at'];
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 20;
    newTableSettingsDto.ordering = QueryOrderingEnum.ASC;
    newTableSettingsDto.ordering_field = 'id';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = ['email', 'id'];
    newTableSettingsDto.sortable_by = ['age', 'first_name', 'second_name', 'created_at'];
    newTableSettingsDto.autocomplete_columns = ['first_name', 'second_name'];
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = ['first_name', 'second_name', 'age', 'email', 'city', 'id', 'created_at'];
    return newTableSettingsDto;
  },

  bigger_users_table_mssql_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'bigger_users_table';
    newTableSettingsDto.display_name = 'BIGGER users table';
    newTableSettingsDto.search_fields = ['first_name', 'second_name', 'city'];
    newTableSettingsDto.excluded_fields = ['updated_at'];
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 20;
    newTableSettingsDto.ordering = QueryOrderingEnum.ASC;
    newTableSettingsDto.ordering_field = 'id';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = ['email', 'id'];
    newTableSettingsDto.sortable_by = ['age', 'first_name', 'second_name', 'created_at'];
    newTableSettingsDto.autocomplete_columns = ['first_name', 'second_name'];
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = ['age', 'city', 'first_name', 'second_name', 'email', 'id', 'created_at'];
    return newTableSettingsDto;
  },

  customers_mssql_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'Customers';
    newTableSettingsDto.display_name = undefined;
    newTableSettingsDto.search_fields = ['FirstName'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 25;
    newTableSettingsDto.ordering = QueryOrderingEnum.DESC;
    newTableSettingsDto.ordering_field = 'Id';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = ['Id'];
    newTableSettingsDto.sortable_by = ['FirstName'];
    newTableSettingsDto.autocomplete_columns = ['FirstName'];
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = undefined;
    return newTableSettingsDto;
  },

  group_mssql_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'group';
    newTableSettingsDto.display_name = 'Groups time';
    newTableSettingsDto.search_fields = ['groupName', 'day'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 30;
    newTableSettingsDto.ordering = QueryOrderingEnum.ASC;
    newTableSettingsDto.ordering_field = 'beggingTime';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = ['beggingTime'];
    newTableSettingsDto.sortable_by = ['groupName', 'day'];
    newTableSettingsDto.autocomplete_columns = undefined;
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = undefined;
    return newTableSettingsDto;
  },

  orders_mssql_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'Orders';
    newTableSettingsDto.display_name = 'Created orders';
    newTableSettingsDto.search_fields = ['CustomerId', 'ProductId', 'status'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 24;
    newTableSettingsDto.ordering = QueryOrderingEnum.DESC;
    newTableSettingsDto.ordering_field = 'CreatedAt';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = undefined;
    newTableSettingsDto.sortable_by = ['Price', 'CustomerId', 'ProductId', 'ProductCount'];
    newTableSettingsDto.autocomplete_columns = undefined;
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = undefined;
    return newTableSettingsDto;
  },

  products_mssql_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'Products';
    newTableSettingsDto.display_name = undefined;
    newTableSettingsDto.search_fields = ['ProductName', 'Manufacturer'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 60;
    newTableSettingsDto.ordering = QueryOrderingEnum.ASC;
    newTableSettingsDto.ordering_field = 'Price';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = undefined;
    newTableSettingsDto.sortable_by = ['Price', 'ProductCount', 'Id'];
    newTableSettingsDto.autocomplete_columns = undefined;
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = undefined;
    return newTableSettingsDto;
  },

  tutorial_mssql_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'tutorial';
    newTableSettingsDto.display_name = undefined;
    newTableSettingsDto.search_fields = undefined;
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 60;
    newTableSettingsDto.ordering = QueryOrderingEnum.DESC;
    newTableSettingsDto.ordering_field = 'maxMembers';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = undefined;
    newTableSettingsDto.sortable_by = ['maxMembers', 'minMembers'];
    newTableSettingsDto.autocomplete_columns = undefined;
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = undefined;
    return newTableSettingsDto;
  },

  users_mssql_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'users';
    newTableSettingsDto.display_name = 'Users Table';
    newTableSettingsDto.search_fields = ['FirstName', 'LastName', 'Email'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.list_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.list_per_page = 10;
    newTableSettingsDto.ordering = QueryOrderingEnum.ASC;
    newTableSettingsDto.ordering_field = 'FirstName';
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = undefined;
    newTableSettingsDto.sortable_by = ['FirstName', 'LastName', 'Age'];
    newTableSettingsDto.autocomplete_columns = undefined;
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    newTableSettingsDto.columns_view = undefined;
    return newTableSettingsDto;
  },

  getMsSQLSettingsDTOs: (connectionId: string): Array<CreateTableSettingsDto> => {
    const dtos = [];
    dtos.push(
      TableSettingForTestConnections.big_users_table_mssql_dto(connectionId),
      TableSettingForTestConnections.bigger_users_table_mssql_dto(connectionId),
      TableSettingForTestConnections.customers_mssql_dto(connectionId),
      TableSettingForTestConnections.group_mssql_dto(connectionId),
      TableSettingForTestConnections.orders_mssql_dto(connectionId),
      TableSettingForTestConnections.products_mssql_dto(connectionId),
      TableSettingForTestConnections.tutorial_mssql_dto(connectionId),
      TableSettingForTestConnections.users_mssql_dto(connectionId),
    );
    return dtos;
  },
};
