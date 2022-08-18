import { getTableTypes } from './setup-table-row-structure';

const fakeProduct_categories = {
    "column_name": "product_categories",
    "column_default": null,
    "data_type": "enum",
    "data_type_params": [
      "food",
      "drinks",
      "cleaning"
    ],
    "isExcluded": false,
    "isSearched": false,
    "auto_increment": false,
    "allow_null": true,
    "character_maximum_length": 1
}

const fakeCustomer_categories = {
    "column_name": "customer_categories",
    "column_default": null,
    "data_type": "enum",
    "data_type_params": [
      "manager",
      "seller"
    ],
    "isExcluded": false,
    "isSearched": false,
    "auto_increment": false,
    "allow_null": true,
    "character_maximum_length": 1
}

const fakeCustomerId = {
    "column_name": "CustomerId",
    "column_default": null,
    "data_type": "int",
    "isExcluded": false,
    "isSearched": true,
    "auto_increment": false,
    "allow_null": false,
    "character_maximum_length": null
}

const fakeProductId = {
    "column_name": "ProductId",
    "column_default": null,
    "data_type": "int",
    "isExcluded": false,
    "isSearched": true,
    "auto_increment": false,
    "allow_null": false,
    "character_maximum_length": null
}

const fakeBool = {
    "column_name": "bool",
    "column_default": null,
    "data_type": "tinyint",
    "isExcluded": false,
    "isSearched": false,
    "auto_increment": false,
    "allow_null": true,
    "character_maximum_length": 1
}

const fakeFloat = {
    "column_name": "float",
    "column_default": null,
    "data_type": "float",
    "isExcluded": false,
    "isSearched": false,
    "auto_increment": false,
    "allow_null": true,
    "character_maximum_length": 102
}

const fakeStructure = [
    fakeProduct_categories,
    fakeCustomer_categories,
    fakeCustomerId,
    fakeProductId,
    fakeBool,
    fakeFloat,
]

const fakeForeignKeysList = ['CustomerId', 'ProductId'];

describe('Normalize function', () => {
    it('should return comparator of filter', () => {
        const tableTypes = getTableTypes(fakeStructure, fakeForeignKeysList);

        expect(tableTypes).toEqual({
            product_categories: "enum",
            customer_categories: "enum",
            CustomerId: "foreign key",
            ProductId: "foreign key",
            bool: "boolean",
            float: "float"
        });
    });
});