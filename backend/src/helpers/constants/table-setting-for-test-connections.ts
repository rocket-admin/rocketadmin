import { CreateTableSettingsDto } from '../../entities/table-settings/common-table-settings/dto/index.js';

export const TableSettingForTestConnections = {
  // create table settings dtos for mysql database

  Users_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'Users';
    newTableSettingsDto.display_name = 'Registered users';
    newTableSettingsDto.search_fields = ['FirstName', 'LastName', 'Email'];
    newTableSettingsDto.excluded_fields = ['Password'];
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = ['ProfileImage', 'UserID'];
    newTableSettingsDto.sortable_by = ['UserID', 'FirstName', 'LastName', 'DateRegistered'];
    newTableSettingsDto.autocomplete_columns = ['FirstName', 'LastName'];
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    return newTableSettingsDto;
  },

  Vendors_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'Vendors';
    newTableSettingsDto.display_name = undefined;
    newTableSettingsDto.search_fields = ['VendorName'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = ['VendorID'];
    newTableSettingsDto.sortable_by = ['ContactEmail'];
    newTableSettingsDto.autocomplete_columns = ['VendorName'];
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    return newTableSettingsDto;
  },

  Categories_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'Categories';
    newTableSettingsDto.display_name = 'Product categories';
    newTableSettingsDto.search_fields = ['CategoryName'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = ['CategoryID'];
    newTableSettingsDto.sortable_by = ['CategoryID', 'CategoryName'];
    newTableSettingsDto.autocomplete_columns = undefined;
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    return newTableSettingsDto;
  },

  Products_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'Products';
    newTableSettingsDto.display_name = undefined;
    newTableSettingsDto.search_fields = ['ProductName'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = undefined;
    newTableSettingsDto.sortable_by = ['Price', 'ProductName', 'VendorID'];
    newTableSettingsDto.autocomplete_columns = undefined;
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    return newTableSettingsDto;
  },

  Orders_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'Orders';
    newTableSettingsDto.display_name = 'Created orders';
    newTableSettingsDto.search_fields = ['ShippingAddress'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = undefined;
    newTableSettingsDto.sortable_by = ['TotalAmount', 'OrderDate', 'OrderStatus'];
    newTableSettingsDto.autocomplete_columns = undefined;
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    return newTableSettingsDto;
  },

  OrderDetails_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'OrderDetails';
    newTableSettingsDto.display_name = 'Details of orders';
    newTableSettingsDto.search_fields = ['OrderID', 'ProductID', 'Price'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = undefined;
    newTableSettingsDto.sortable_by = ['OrderID', 'ProductID', 'Price', 'Quantity'];
    newTableSettingsDto.autocomplete_columns = undefined;
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    return newTableSettingsDto;
  },

  Reviews_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'Reviews';
    newTableSettingsDto.display_name = 'Product reviews';
    newTableSettingsDto.search_fields = ['ProductID', 'Comment'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = undefined;
    newTableSettingsDto.sortable_by = ['Rating', 'ProductID', 'UserID', 'ReviewID'];
    newTableSettingsDto.autocomplete_columns = undefined;
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    return newTableSettingsDto;
  },

  Payments_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'Payments';
    newTableSettingsDto.display_name = undefined;
    newTableSettingsDto.search_fields = ['OrderID', 'PaymentDate'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = undefined;
    newTableSettingsDto.sortable_by = ['PaymentDate', 'OrderID', 'Amount'];
    newTableSettingsDto.autocomplete_columns = undefined;
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    return newTableSettingsDto;
  },

  DiscountsCoupons_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'DiscountsCoupons';
    newTableSettingsDto.display_name = 'Discounts and coupons';
    newTableSettingsDto.search_fields = ['CouponID', 'CouponCode'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = undefined;
    newTableSettingsDto.sortable_by = ['ExpiryDate', 'MinimumOrderAmount', 'DiscountAmount'];
    newTableSettingsDto.autocomplete_columns = undefined;
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    return newTableSettingsDto;
  },

  Shipping_dto: (connectionId: string): CreateTableSettingsDto => {
    const newTableSettingsDto = new CreateTableSettingsDto();
    newTableSettingsDto.connection_id = connectionId;
    newTableSettingsDto.table_name = 'Shipping';
    newTableSettingsDto.display_name = 'Shipping details';
    newTableSettingsDto.search_fields = ['OrderID', 'TrackingNumber'];
    newTableSettingsDto.excluded_fields = undefined;
    newTableSettingsDto.identification_fields = undefined;
    newTableSettingsDto.identity_column = undefined;
    newTableSettingsDto.readonly_fields = undefined;
    newTableSettingsDto.sortable_by = ['ShippingDate', 'EstimatedDeliveryDate'];
    newTableSettingsDto.autocomplete_columns = undefined;
    newTableSettingsDto.custom_fields = undefined;
    newTableSettingsDto.table_widgets = undefined;
    return newTableSettingsDto;
  },

  getMySQLTableSettingsDTOs: (connectionId: string): Array<CreateTableSettingsDto> => {
    const dtos = [];
    dtos.push(
      TableSettingForTestConnections.Users_dto(connectionId),
      TableSettingForTestConnections.Vendors_dto(connectionId),
      TableSettingForTestConnections.Categories_dto(connectionId),
      TableSettingForTestConnections.Products_dto(connectionId),
      TableSettingForTestConnections.Orders_dto(connectionId),
      TableSettingForTestConnections.OrderDetails_dto(connectionId),
      TableSettingForTestConnections.Reviews_dto(connectionId),
      TableSettingForTestConnections.Payments_dto(connectionId),
      TableSettingForTestConnections.DiscountsCoupons_dto(connectionId),
      TableSettingForTestConnections.Shipping_dto(connectionId),
    );
    return dtos;
  },

  getPostgresSettingsDTOs: (connectionId: string): Array<CreateTableSettingsDto> => {
    const dtos = [];
    dtos.push(
      TableSettingForTestConnections.Users_dto(connectionId),
      TableSettingForTestConnections.Vendors_dto(connectionId),
      TableSettingForTestConnections.Categories_dto(connectionId),
      TableSettingForTestConnections.Products_dto(connectionId),
      TableSettingForTestConnections.Orders_dto(connectionId),
      TableSettingForTestConnections.OrderDetails_dto(connectionId),
      TableSettingForTestConnections.Reviews_dto(connectionId),
      TableSettingForTestConnections.Payments_dto(connectionId),
      TableSettingForTestConnections.DiscountsCoupons_dto(connectionId),
      TableSettingForTestConnections.Shipping_dto(connectionId),
    );
    return dtos;
  },

  getOracleSettingsDTOs: (connectionId: string): Array<CreateTableSettingsDto> => {
    const dtos = [];
    dtos.push(
      TableSettingForTestConnections.Users_dto(connectionId),
      TableSettingForTestConnections.Vendors_dto(connectionId),
      TableSettingForTestConnections.Categories_dto(connectionId),
      TableSettingForTestConnections.Products_dto(connectionId),
      TableSettingForTestConnections.Orders_dto(connectionId),
      TableSettingForTestConnections.OrderDetails_dto(connectionId),
      TableSettingForTestConnections.Reviews_dto(connectionId),
      TableSettingForTestConnections.Payments_dto(connectionId),
      TableSettingForTestConnections.DiscountsCoupons_dto(connectionId),
      TableSettingForTestConnections.Shipping_dto(connectionId),
    );
    return dtos;
  },

  getMsSQLSettingsDTOs: (connectionId: string): Array<CreateTableSettingsDto> => {
    const dtos = [];
    dtos.push(
      TableSettingForTestConnections.Users_dto(connectionId),
      TableSettingForTestConnections.Vendors_dto(connectionId),
      TableSettingForTestConnections.Categories_dto(connectionId),
      TableSettingForTestConnections.Products_dto(connectionId),
      TableSettingForTestConnections.Orders_dto(connectionId),
      TableSettingForTestConnections.OrderDetails_dto(connectionId),
      TableSettingForTestConnections.Reviews_dto(connectionId),
      TableSettingForTestConnections.Payments_dto(connectionId),
      TableSettingForTestConnections.DiscountsCoupons_dto(connectionId),
      TableSettingForTestConnections.Shipping_dto(connectionId),
    );
    return dtos;
  },
};
