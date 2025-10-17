import { getTestKnex } from '../../../utils/get-test-knex.js';
import { faker } from '@faker-js/faker';

export const createTestTablesWithComplexPFKeys = async (connectionParams: any) => {
  const connectionParamsCopy = {
    ...connectionParams,
  };
  if (connectionParams.type === 'mysql') {
    connectionParamsCopy.type = 'mysql2';
  }

  const knex = getTestKnex(connectionParamsCopy);

  const mainTableName = 'Orders_Complex';
  const firstReferencedTableName = 'OrderItems_Complex';
  const referencedOnTableName = 'Shipments_Complex';

  await knex.schema.dropTableIfExists(referencedOnTableName);
  await knex.schema.dropTableIfExists(firstReferencedTableName);
  await knex.schema.dropTableIfExists(mainTableName);

  // Create main_table
  await knex.schema.createTable(mainTableName, (table) => {
    table.integer('order_id').notNullable();
    table.integer('customer_id').notNullable();
    table.date('order_date');
    table.string('status', 20);
    table.decimal('total_amount', 10, 2);
    table.primary(['order_id', 'customer_id']);
  });

  // Create first_referenced_table
  const firstReferencedTableQuery = knex.schema.createTable(firstReferencedTableName, (table) => {
    table.integer('order_id').notNullable();
    table.integer('customer_id').notNullable();
    table.increments('item_id').primary();
    table.string('product_name', 100);
    table.integer('quantity');
    table.decimal('price_per_unit', 10, 2);
    table
      .foreign(['order_id', 'customer_id'])
      .references(['order_id', 'customer_id'])
      .inTable(mainTableName)
      .onDelete('CASCADE');
  });
  console.log('SQL Query for first_referenced_table:', firstReferencedTableQuery.toString());
  await firstReferencedTableQuery;

  // Create second_referenced_table
  await knex.schema.createTable(referencedOnTableName, (table) => {
    table.increments('shipment_id').primary();
    table.integer('order_id');
    table.integer('customer_id');
    table.date('shipped_date');
    table.string('carrier', 50);
    table.string('tracking_number', 100);
    table
      .foreign(['order_id', 'customer_id'])
      .references(['order_id', 'customer_id'])
      .inTable(mainTableName)
      .onDelete('SET NULL');
  });

  // seeding data in test tables

  const testEntitiesCount = 42;

  const mainTableInserts = [];
  const firstReferencedTableInserts = [];
  const secondReferencedTableInserts = [];

  for (let i = 0; i < testEntitiesCount; i++) {
    const orderId = i + 1;
    const customerId = 100 + i;
    mainTableInserts.push({
      order_id: orderId,
      customer_id: customerId,
      order_date: faker.date.past({ years: 1 }),
      status: faker.helpers.arrayElement(['Pending', 'Shipped', 'Delivered', 'Cancelled']),
      total_amount: parseFloat(faker.commerce.price({ min: 20, max: 500, dec: 2 })),
    });

    const itemsCount = faker.number.int({ min: 1, max: 5 });
    for (let j = 0; j < itemsCount; j++) {
      firstReferencedTableInserts.push({
        order_id: orderId,
        customer_id: customerId,
        product_name: faker.commerce.productName(),
        quantity: faker.number.int({ min: 1, max: 10 }),
        price_per_unit: parseFloat(faker.commerce.price({ min: 5, max: 100, dec: 2 })),
      });
    }

    if (faker.datatype.boolean()) {
      secondReferencedTableInserts.push({
        order_id: orderId,
        customer_id: customerId,
        shipped_date: faker.date.recent({ days: 30 }),
        carrier: faker.company.name(),
        tracking_number: faker.string.uuid(),
      });
    }
  }

  await knex(mainTableName).insert(mainTableInserts);
  await knex(firstReferencedTableName).insert(firstReferencedTableInserts);
  await knex(referencedOnTableName).insert(secondReferencedTableInserts);

  // Fetch column info

  const mainTableColumnData = await knex(mainTableName).columnInfo();
  const firstReferencedTableColumnData = await knex(firstReferencedTableName).columnInfo();
  const secondReferencedTableColumnData = await knex(referencedOnTableName).columnInfo();

  return {
    main_table: {
      table_name: mainTableName,
      column_names: Object.keys(mainTableColumnData),
      foreign_key_column_names: [],
      binary_column_names: [],
      primary_key_column_names: ['order_id', 'customer_id'],
    },
    first_referenced_table: {
      table_name: firstReferencedTableName,
      column_names: Object.keys(firstReferencedTableColumnData),
      primary_key_column_names: ['item_id'],
    },
    second_referenced_table: {
      table_name: referencedOnTableName,
      column_names: Object.keys(secondReferencedTableColumnData),
      primary_key_column_names: ['shipment_id'],
      foreign_key_column_names: [],
    },
  };
};

export const createTestTablesWithSimplePFKeys = async (connectionParams: any) => {
  const connectionParamsCopy = {
    ...connectionParams,
  };
  if (connectionParams.type === 'mysql') {
    connectionParamsCopy.type = 'mysql2';
  }

  const knex = getTestKnex(connectionParamsCopy);

  //   -- Table 1: Customers (simple primary key)
  // CREATE TABLE customers (
  //     customer_id SERIAL PRIMARY KEY,
  //     name VARCHAR(100),
  //     email VARCHAR(100),
  //     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  // );

  // -- Table 2: Orders (foreign key to Customers)
  // CREATE TABLE orders (
  //     order_id SERIAL PRIMARY KEY,
  //     customer_id INT,
  //     order_date DATE,
  //     status VARCHAR(20),
  //     total_amount DECIMAL(10, 2),
  //     FOREIGN KEY (customer_id)
  //         REFERENCES customers(customer_id)
  //         ON DELETE CASCADE
  // );

  // -- Table 3: Shipments (foreign key to Orders)
  // CREATE TABLE shipments (
  //     shipment_id SERIAL PRIMARY KEY,
  //     order_id INT,
  //     shipped_date DATE,
  //     carrier VARCHAR(50),
  //     tracking_number VARCHAR(100),
  //     FOREIGN KEY (order_id)
  //         REFERENCES orders(order_id)
  //         ON DELETE SET NULL
  // );

  const mainTableName = 'Customers_Simple';
  const firstReferencedTableName = 'Orders_Simple';
  const secondReferencedTableName = 'Shipments_Simple';

  await knex.schema.dropTableIfExists(secondReferencedTableName);
  await knex.schema.dropTableIfExists(firstReferencedTableName);
  await knex.schema.dropTableIfExists(mainTableName);

  // Create main_table
  await knex.schema.createTable(mainTableName, (table) => {
    table.increments('customer_id').primary();
    table.string('name', 100);
    table.string('email', 100);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Create first_referenced_table
  await knex.schema.createTable(firstReferencedTableName, (table) => {
    table.increments('order_id').primary();
    table.integer('customer_id').notNullable();
    table.date('order_date');
    table.string('status', 20);
    table.decimal('total_amount', 10, 2);
    table.foreign('customer_id').references('customer_id').inTable(mainTableName).onDelete('CASCADE');
  });

  // Create second_referenced_table
  await knex.schema.createTable(secondReferencedTableName, (table) => {
    table.increments('shipment_id').primary();
    table.integer('order_id');
    table.date('shipped_date');
    table.string('carrier', 50);
    table.string('tracking_number', 100);
    table.foreign('order_id').references('order_id').inTable(firstReferencedTableName).onDelete('SET NULL');
  });

  // seeding data in test tables

  const testEntitiesCount = 42;

  const mainTableInserts = [];
  const firstReferencedTableInserts = [];
  const secondReferencedTableInserts = [];

  for (let i = 0; i < testEntitiesCount; i++) {
    mainTableInserts.push({
      name: faker.person.fullName(),
      email: faker.internet.email(),
    });
  }

  const insertedCustomerIds = await knex(mainTableName).insert(mainTableInserts).returning('customer_id');

  for (let i = 0; i < testEntitiesCount; i++) {
    const customerId = Array.isArray(insertedCustomerIds)
      ? typeof insertedCustomerIds[i] === 'object'
        ? (insertedCustomerIds[i] as any).customer_id
        : insertedCustomerIds[i]
      : insertedCustomerIds;
    const orderId = i + 1;
    firstReferencedTableInserts.push({
      customer_id: customerId,
      order_date: faker.date.past({ years: 1 }),
      status: faker.helpers.arrayElement(['Pending', 'Shipped', 'Delivered', 'Cancelled']),
      total_amount: parseFloat(faker.commerce.price({ min: 20, max: 500, dec: 2 })),
    });

    if (faker.datatype.boolean()) {
      secondReferencedTableInserts.push({
        order_id: orderId,
        shipped_date: faker.date.recent({ days: 30 }),
        carrier: faker.company.name(),
        tracking_number: faker.string.uuid(),
      });
    }
  }

  const insertedOrderIds = await knex(firstReferencedTableName)
    .insert(firstReferencedTableInserts)
    .returning('order_id');

  // Adjust order_id in shipments to match inserted orders
  for (let i = 0; i < secondReferencedTableInserts.length; i++) {
    if (insertedOrderIds[i]) {
      secondReferencedTableInserts[i].order_id = Array.isArray(insertedOrderIds)
        ? typeof insertedOrderIds[i] === 'object'
          ? (insertedOrderIds[i] as any).order_id
          : insertedOrderIds[i]
        : insertedOrderIds;
    }
  }

  await knex(secondReferencedTableName).insert(secondReferencedTableInserts);

  // Fetch column info

  const mainTableColumnData = await knex(mainTableName).columnInfo();
  const firstReferencedTableColumnData = await knex(firstReferencedTableName).columnInfo();
  const secondReferencedTableColumnData = await knex(secondReferencedTableName).columnInfo();

  return {
    main_table: {
      table_name: mainTableName,
      column_names: Object.keys(mainTableColumnData),
      foreign_key_column_names: [],
      binary_column_names: [],
      primary_key_column_names: ['customer_id'],
    },
    first_referenced_table: {
      table_name: firstReferencedTableName,
      column_names: Object.keys(firstReferencedTableColumnData),
      primary_key_column_names: ['order_id'],
      foreign_key_column_names: ['customer_id'],
    },
    second_referenced_table: {
      table_name: secondReferencedTableName,
      column_names: Object.keys(secondReferencedTableColumnData),
      primary_key_column_names: ['shipment_id'],
      foreign_key_column_names: ['order_id'],
    },
  };
};
