import ibmdb, { Database } from 'ibm_db';
import { TableCreationResult } from '../../ava-tests/complex-table-tests/complex-ibmdb2-table-e2e.test.js';

export const createTestIBMDB2TablesWithComplexPFKeys = async (connectionParams: any): Promise<TableCreationResult> => {
  const mainTableName = 'ORDERS_COMPLEX';
  const firstReferencedTableName = 'ORDER_ITEMS_COMPLEX';
  const referencedOnTableName = 'SHIPMENTS_COMPLEX';

  // Create main_table
  // await knex.schema.createTable(mainTableName, (table) => {
  //   table.integer('order_id').notNullable();
  //   table.integer('customer_id').notNullable();
  //   table.date('order_date');
  //   table.string('status', 20);
  //   table.decimal('total_amount', 10, 2);
  //   table.primary(['order_id', 'customer_id']);
  // });

  // // Create first_referenced_table
  // const firstReferencedTableQuery = knex.schema.createTable(firstReferencedTableName, (table) => {
  //   table.integer('order_id').notNullable();
  //   table.integer('customer_id').notNullable();
  //   table.increments('item_id').primary();
  //   table.string('product_name', 100);
  //   table.integer('quantity');
  //   table.decimal('price_per_unit', 10, 2);
  //   table
  //     .foreign(['order_id', 'customer_id'])
  //     .references(['order_id', 'customer_id'])
  //     .inTable(mainTableName)
  //     .onDelete('CASCADE');
  // });
  // await firstReferencedTableQuery;

  // // Create second_referenced_table
  // await knex.schema.createTable(referencedOnTableName, (table) => {
  //   table.increments('shipment_id').primary();
  //   table.integer('order_id');
  //   table.integer('customer_id');
  //   table.date('shipped_date');
  //   table.string('carrier', 50);
  //   table.string('tracking_number', 100);
  //   table
  //     .foreign(['order_id', 'customer_id'])
  //     .references(['order_id', 'customer_id'])
  //     .inTable(mainTableName)
  //     .onDelete('SET NULL');
  // });

  const connStr = `DATABASE=${connectionParams.database};HOSTNAME=${connectionParams.host};UID=${connectionParams.username};PWD=${connectionParams.password};PORT=${connectionParams.port};PROTOCOL=TCPIP`;

  const ibmDatabase = ibmdb();
  await ibmDatabase.open(connStr);
  const queryCheckSchemaExists = `SELECT COUNT(*) FROM SYSCAT.SCHEMATA WHERE SCHEMANAME = '${connectionParams.schema}'`;
  const schemaExists = await ibmDatabase.query(queryCheckSchemaExists);

  if (!schemaExists.length || !schemaExists[0]['1']) {
    const queryCreateSchema = `CREATE SCHEMA ${connectionParams.schema}`;
    try {
      await ibmDatabase.query(queryCreateSchema);
    } catch (error) {
      console.error(`Error while creating schema: ${error}`);
      console.info(`Query: ${queryCreateSchema}`);
    }
  }

  const queryCheckFirstTableExists = `SELECT COUNT(*) FROM SYSCAT.TABLES WHERE TABNAME = '${mainTableName}' AND TABSCHEMA = '${connectionParams.schema}'`;
  const queryCheckSecondTableExists = `SELECT COUNT(*) FROM SYSCAT.TABLES WHERE TABNAME = '${firstReferencedTableName}' AND TABSCHEMA = '${connectionParams.schema}'`;
  const queryCheckThirdTableExists = `SELECT COUNT(*) FROM SYSCAT.TABLES WHERE TABNAME = '${referencedOnTableName}' AND TABSCHEMA = '${connectionParams.schema}'`;

  const firstTableExists = await ibmDatabase.query(queryCheckFirstTableExists);
  const secondTableExists = await ibmDatabase.query(queryCheckSecondTableExists);
  const thirdTableExists = await ibmDatabase.query(queryCheckThirdTableExists);

  if (thirdTableExists.length && thirdTableExists[0]['1']) {
    await ibmDatabase.query(`DROP TABLE ${connectionParams.schema}.${thirdTableExists}`);
  }
  if (secondTableExists.length && secondTableExists[0]['1']) {
    await ibmDatabase.query(`DROP TABLE ${connectionParams.schema}.${firstReferencedTableName}`);
  }
  if (firstTableExists.length && firstTableExists[0]['1']) {
    await ibmDatabase.query(`DROP TABLE ${connectionParams.schema}.${mainTableName}`);
  }

  const queryCreateMainTable = `
    CREATE TABLE ${connectionParams.schema}.${mainTableName} (
      order_id INT NOT NULL,
      customer_id INT NOT NULL,
      order_date DATE,
      status VARCHAR(20),
      total_amount DECIMAL(10, 2),
      PRIMARY KEY (order_id, customer_id)
    )
  `;

  const queryCreateFirstReferencedTable = `
    CREATE TABLE ${connectionParams.schema}.${firstReferencedTableName} (
      order_id INT NOT NULL,
      customer_id INT NOT NULL,
      item_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      product_name VARCHAR(100),
      quantity INT,
      price_per_unit DECIMAL(10, 2),
      FOREIGN KEY (order_id, customer_id) REFERENCES ${connectionParams.schema}.${mainTableName}(order_id, customer_id) ON DELETE CASCADE
    )
  `;

  const queryCreateSecondReferencedTable = `
    CREATE TABLE ${connectionParams.schema}.${referencedOnTableName} (
      shipment_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      order_id INT,
      customer_id INT,
      shipped_date DATE,
      carrier VARCHAR(50),
      tracking_number VARCHAR(100),
      FOREIGN KEY (order_id, customer_id) REFERENCES ${connectionParams.schema}.${mainTableName}(order_id, customer_id) ON DELETE SET NULL
    )
  `;

  try {
    await ibmDatabase.query(queryCreateMainTable);
    await ibmDatabase.query(queryCreateFirstReferencedTable);
    await ibmDatabase.query(queryCreateSecondReferencedTable);
  } catch (error) {
    console.error(`Error while creating tables: ${error}`);
    console.info(`Queries:
      ${queryCreateMainTable}
      ${queryCreateFirstReferencedTable}
      ${queryCreateSecondReferencedTable}
    `);
  }

  // populate tables with test data

  const insertMainTableData = `
    INSERT INTO ${connectionParams.schema}.${mainTableName} (order_id, customer_id, order_date, status, total_amount) VALUES
    (1, 101, '2023-01-15', 'Shipped', 250.75),
    (2, 102, '2023-01-16', 'Processing', 150.50),
    (3, 103, '2023-01-17', 'Delivered', 300.00),
    (4, 104, '2023-01-18', 'Pending', 425.30),
    (5, 105, '2023-01-19', 'Shipped', 189.99),
    (6, 106, '2023-01-20', 'Cancelled', 75.25),
    (7, 107, '2023-01-21', 'Processing', 550.00),
    (8, 108, '2023-01-22', 'Delivered', 399.50),
    (9, 109, '2023-01-23', 'Shipped', 275.80),
    (10, 110, '2023-01-24', 'Processing', 680.45),
    (11, 111, '2023-01-25', 'Shipped', 320.15),
    (12, 112, '2023-01-26', 'Delivered', 445.90),
    (13, 113, '2023-01-27', 'Pending', 199.99),
    (14, 114, '2023-01-28', 'Processing', 525.30),
    (15, 115, '2023-01-29', 'Shipped', 289.75),
    (16, 116, '2023-01-30', 'Cancelled', 95.50),
    (17, 117, '2023-01-31', 'Delivered', 610.20),
    (18, 118, '2023-02-01', 'Processing', 375.85),
    (19, 119, '2023-02-02', 'Shipped', 455.60),
    (20, 120, '2023-02-03', 'Pending', 225.40),
    (21, 121, '2023-02-04', 'Delivered', 505.95),
    (22, 122, '2023-02-05', 'Processing', 340.25),
    (23, 123, '2023-02-06', 'Shipped', 420.80),
    (24, 124, '2023-02-07', 'Cancelled', 125.00),
    (25, 125, '2023-02-08', 'Delivered', 590.45),
    (26, 126, '2023-02-09', 'Processing', 310.70),
    (27, 127, '2023-02-10', 'Shipped', 475.30),
    (28, 128, '2023-02-11', 'Pending', 265.85),
    (29, 129, '2023-02-12', 'Delivered', 535.20),
    (30, 130, '2023-02-13', 'Processing', 395.65),
    (31, 131, '2023-02-14', 'Shipped', 485.90),
    (32, 132, '2023-02-15', 'Cancelled', 155.25),
    (33, 133, '2023-02-16', 'Delivered', 625.40),
    (34, 134, '2023-02-17', 'Processing', 355.75),
    (35, 135, '2023-02-18', 'Shipped', 495.20),
    (36, 136, '2023-02-19', 'Pending', 285.95),
    (37, 137, '2023-02-20', 'Delivered', 565.30),
    (38, 138, '2023-02-21', 'Processing', 415.85),
    (39, 139, '2023-02-22', 'Shipped', 515.60),
    (40, 140, '2023-02-23', 'Cancelled', 185.40),
    (41, 141, '2023-02-24', 'Delivered', 655.75),
    (42, 142, '2023-02-25', 'Processing', 435.90)
  `;

  const insertFirstReferencedTableData = `
    INSERT INTO ${connectionParams.schema}.${firstReferencedTableName} (order_id, customer_id, product_name, quantity, price_per_unit) VALUES
    (1, 101, 'Product A', 2, 50.00),
    (2, 102, 'Product B', 3, 30.25),
    (3, 103, 'Product C', 4, 75.00),
    (4, 104, 'Product D', 5, 85.06),
    (5, 105, 'Product E', 2, 94.99),
    (6, 106, 'Product F', 1, 75.25),
    (7, 107, 'Product G', 3, 183.33),
    (8, 108, 'Product H', 6, 66.58),
    (9, 109, 'Product I', 4, 68.95),
    (10, 110, 'Product J', 7, 97.21),
    (11, 111, 'Product K', 2, 160.07),
    (12, 112, 'Product L', 5, 89.18),
    (13, 113, 'Product M', 3, 66.66),
    (14, 114, 'Product N', 4, 131.32),
    (15, 115, 'Product O', 2, 144.87),
    (16, 116, 'Product P', 1, 95.50),
    (17, 117, 'Product Q', 6, 101.70),
    (18, 118, 'Product R', 3, 125.28),
    (19, 119, 'Product S', 5, 91.12),
    (20, 120, 'Product T', 2, 112.70),
    (21, 121, 'Product U', 4, 126.48),
    (22, 122, 'Product V', 3, 113.41),
    (23, 123, 'Product W', 5, 84.16),
    (24, 124, 'Product X', 1, 125.00),
    (25, 125, 'Product Y', 6, 98.40),
    (26, 126, 'Product Z', 2, 155.35),
    (27, 127, 'Product AA', 4, 118.82),
    (28, 128, 'Product AB', 3, 88.61),
    (29, 129, 'Product AC', 5, 107.04),
    (30, 130, 'Product AD', 2, 197.82),
    (31, 131, 'Product AE', 4, 121.47),
    (32, 132, 'Product AF', 1, 155.25),
    (33, 133, 'Product AG', 6, 104.23),
    (34, 134, 'Product AH', 3, 118.58),
    (35, 135, 'Product AI', 5, 99.04),
    (36, 136, 'Product AJ', 2, 142.97),
    (37, 137, 'Product AK', 4, 141.32),
    (38, 138, 'Product AL', 3, 138.61),
    (39, 139, 'Product AM', 5, 103.12),
    (40, 140, 'Product AN', 1, 185.40),
    (41, 141, 'Product AO', 6, 109.29),
    (42, 142, 'Product AP', 2, 217.95)
  `;

  const insertSecondReferencedTableData = `
    INSERT INTO ${connectionParams.schema}.${referencedOnTableName} (order_id, customer_id, shipped_date, carrier, tracking_number) VALUES
    (1, 101, '2023-01-18', 'Carrier X', 'TRACK12345'),
    (3, 103, '2023-01-20', 'Carrier Y', 'TRACK67890'),
    (5, 105, '2023-01-22', 'Carrier X', 'TRACK11111'),
    (8, 108, '2023-01-25', 'Carrier Z', 'TRACK22222'),
    (9, 109, '2023-01-26', 'Carrier Y', 'TRACK33333'),
    (11, 111, '2023-01-28', 'Carrier X', 'TRACK44444'),
    (12, 112, '2023-01-29', 'Carrier Z', 'TRACK55555'),
    (15, 115, '2023-02-01', 'Carrier Y', 'TRACK66666'),
    (17, 117, '2023-02-03', 'Carrier X', 'TRACK77777'),
    (19, 119, '2023-02-05', 'Carrier Z', 'TRACK88888'),
    (21, 121, '2023-02-07', 'Carrier Y', 'TRACK99999'),
    (23, 123, '2023-02-09', 'Carrier X', 'TRACK10101'),
    (25, 125, '2023-02-11', 'Carrier Z', 'TRACK20202'),
    (27, 127, '2023-02-13', 'Carrier Y', 'TRACK30303'),
    (29, 129, '2023-02-15', 'Carrier X', 'TRACK40404'),
    (31, 131, '2023-02-17', 'Carrier Z', 'TRACK50505'),
    (33, 133, '2023-02-19', 'Carrier Y', 'TRACK60606'),
    (35, 135, '2023-02-21', 'Carrier X', 'TRACK70707'),
    (37, 137, '2023-02-23', 'Carrier Z', 'TRACK80808'),
    (39, 139, '2023-02-25', 'Carrier Y', 'TRACK90909'),
    (41, 141, '2023-02-27', 'Carrier X', 'TRACK11011'),
    (1, 101, '2023-01-19', 'Carrier Y', 'TRACK11121'),
    (3, 103, '2023-01-21', 'Carrier Z', 'TRACK11131'),
    (5, 105, '2023-01-23', 'Carrier X', 'TRACK11141'),
    (8, 108, '2023-01-26', 'Carrier Y', 'TRACK11151'),
    (9, 109, '2023-01-27', 'Carrier Z', 'TRACK11161'),
    (11, 111, '2023-01-29', 'Carrier Y', 'TRACK11171'),
    (12, 112, '2023-01-30', 'Carrier X', 'TRACK11181'),
    (15, 115, '2023-02-02', 'Carrier Z', 'TRACK11191'),
    (17, 117, '2023-02-04', 'Carrier Y', 'TRACK11201'),
    (19, 119, '2023-02-06', 'Carrier X', 'TRACK11211'),
    (21, 121, '2023-02-08', 'Carrier Z', 'TRACK11221'),
    (23, 123, '2023-02-10', 'Carrier Y', 'TRACK11231'),
    (25, 125, '2023-02-12', 'Carrier X', 'TRACK11241'),
    (27, 127, '2023-02-14', 'Carrier Z', 'TRACK11251'),
    (29, 129, '2023-02-16', 'Carrier Y', 'TRACK11261'),
    (31, 131, '2023-02-18', 'Carrier X', 'TRACK11271'),
    (33, 133, '2023-02-20', 'Carrier Z', 'TRACK11281'),
    (35, 135, '2023-02-22', 'Carrier Y', 'TRACK11291'),
    (37, 137, '2023-02-24', 'Carrier X', 'TRACK11301'),
    (39, 139, '2023-02-26', 'Carrier Z', 'TRACK11311'),
    (41, 141, '2023-02-28', 'Carrier Y', 'TRACK11321')
  `;

  try {
    await ibmDatabase.query(insertMainTableData);
    await ibmDatabase.query(insertFirstReferencedTableData);
    await ibmDatabase.query(insertSecondReferencedTableData);
  } catch (error) {
    console.error(`Error while inserting data: ${error}`);
    console.info(`Insert Queries:
      ${insertMainTableData}
      ${insertFirstReferencedTableData}
      ${insertSecondReferencedTableData}
    `);
  }

  await ibmDatabase.close();

  return {
    first_referenced_table: {
      table_name: firstReferencedTableName,
      column_names: ['order_id', 'customer_id', 'item_id', 'product_name', 'quantity', 'price_per_unit'],
      primary_key_column_names: ['item_id'],
    },
    main_table: {
      table_name: mainTableName,
      column_names: ['order_id', 'customer_id', 'order_date', 'status', 'total_amount'],
      foreign_key_column_names: [],
      binary_column_names: [],
      primary_key_column_names: ['order_id', 'customer_id'],
    },
    second_referenced_table: {
      table_name: referencedOnTableName,
      column_names: ['shipment_id', 'order_id', 'customer_id', 'shipped_date', 'carrier', 'tracking_number'],
      primary_key_column_names: ['shipment_id'],
      foreign_key_column_names: ['order_id', 'customer_id'],
    },
  };
};

export const createTestIBMDB2TablesWithSimplePFKeys = async (connectionParams: any): Promise<TableCreationResult> => {
  const mainTableName = 'ORDERS_SIMPLE';
  const firstReferencedTableName = 'ORDER_ITEMS_SIMPLE';
  const referencedOnTableName = 'SHIPMENTS_SIMPLE';

  const connStr = `DATABASE=${connectionParams.database};HOSTNAME=${connectionParams.host};UID=${connectionParams.username};PWD=${connectionParams.password};PORT=${connectionParams.port};PROTOCOL=TCPIP`;

  const ibmDatabase = ibmdb();
  await ibmDatabase.open(connStr);
  const queryCheckSchemaExists = `SELECT COUNT(*) FROM SYSCAT.SCHEMATA WHERE SCHEMANAME = '${connectionParams.schema}'`;
  const schemaExists = await ibmDatabase.query(queryCheckSchemaExists);

  if (!schemaExists.length || !schemaExists[0]['1']) {
    const queryCreateSchema = `CREATE SCHEMA ${connectionParams.schema}`;
    try {
      await ibmDatabase.query(queryCreateSchema);
    } catch (error) {
      console.error(`Error while creating schema: ${error}`);
      console.info(`Query: ${queryCreateSchema}`);
    }
  }

  const queryCheckFirstTableExists = `SELECT COUNT(*) FROM SYSCAT.TABLES WHERE TABNAME = '${mainTableName}' AND TABSCHEMA = '${connectionParams.schema}'`;
  const queryCheckSecondTableExists = `SELECT COUNT(*) FROM SYSCAT.TABLES WHERE TABNAME = '${firstReferencedTableName}' AND TABSCHEMA = '${connectionParams.schema}'`;
  const queryCheckThirdTableExists = `SELECT COUNT(*) FROM SYSCAT.TABLES WHERE TABNAME = '${referencedOnTableName}' AND TABSCHEMA = '${connectionParams.schema}'`;

  const firstTableExists = await ibmDatabase.query(queryCheckFirstTableExists);
  const secondTableExists = await ibmDatabase.query(queryCheckSecondTableExists);
  const thirdTableExists = await ibmDatabase.query(queryCheckThirdTableExists);

  if (thirdTableExists.length && thirdTableExists[0]['1']) {
    await ibmDatabase.query(`DROP TABLE ${connectionParams.schema}.${referencedOnTableName}`);
  }
  if (secondTableExists.length && secondTableExists[0]['1']) {
    await ibmDatabase.query(`DROP TABLE ${connectionParams.schema}.${firstReferencedTableName}`);
  }
  if (firstTableExists.length && firstTableExists[0]['1']) {
    await ibmDatabase.query(`DROP TABLE ${connectionParams.schema}.${mainTableName}`);
  }

  const queryCreateMainTable = `
    CREATE TABLE ${connectionParams.schema}.${mainTableName} (
      order_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      customer_id INT NOT NULL,
      order_date DATE,
      status VARCHAR(20),
      total_amount DECIMAL(10, 2)
    )
  `;

  const queryCreateFirstReferencedTable = `
    CREATE TABLE ${connectionParams.schema}.${firstReferencedTableName} (
      item_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      order_id INT NOT NULL,
      product_name VARCHAR(100),
      quantity INT,
      price_per_unit DECIMAL(10, 2),
      FOREIGN KEY (order_id) REFERENCES ${connectionParams.schema}.${mainTableName}(order_id) ON DELETE CASCADE
    )
  `;

  const queryCreateSecondReferencedTable = `
    CREATE TABLE ${connectionParams.schema}.${referencedOnTableName} (
      shipment_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      order_id INT,
      shipped_date DATE,
      carrier VARCHAR(50),
      tracking_number VARCHAR(100),
      FOREIGN KEY (order_id) REFERENCES ${connectionParams.schema}.${mainTableName}(order_id) ON DELETE SET NULL
    )
  `;

  try {
    await ibmDatabase.query(queryCreateMainTable);
    await ibmDatabase.query(queryCreateFirstReferencedTable);
    await ibmDatabase.query(queryCreateSecondReferencedTable);
  } catch (error) {
    console.error(`Error while creating tables: ${error}`);
    console.info(`Queries:
      ${queryCreateMainTable}
      ${queryCreateFirstReferencedTable}
      ${queryCreateSecondReferencedTable}
    `);
  }

  // populate tables with test data

  const insertMainTableData = `
    INSERT INTO ${connectionParams.schema}.${mainTableName} (customer_id, order_date, status, total_amount) VALUES
    (101, '2023-01-15', 'Shipped', 250.75),
    (102, '2023-01-16', 'Processing', 150.50),
    (103, '2023-01-17', 'Delivered', 300.00),
    (104, '2023-01-18', 'Pending', 425.30),
    (105, '2023-01-19', 'Shipped', 189.99),
    (106, '2023-01-20', 'Cancelled', 75.25),
    (107, '2023-01-21', 'Processing', 550.00),
    (108, '2023-01-22', 'Delivered', 399.50),
    (109, '2023-01-23', 'Shipped', 275.80),
    (110, '2023-01-24', 'Processing', 680.45),
    (111, '2023-01-25', 'Shipped', 320.15),
    (112, '2023-01-26', 'Delivered', 445.90),
    (113, '2023-01-27', 'Pending', 199.99),
    (114, '2023-01-28', 'Processing', 525.30),
    (115, '2023-01-29', 'Shipped', 289.75),
    (116, '2023-01-30', 'Cancelled', 95.50),
    (117, '2023-01-31', 'Delivered', 610.20),
    (118, '2023-02-01', 'Processing', 375.85),
    (119, '2023-02-02', 'Shipped', 455.60),
    (120, '2023-02-03', 'Pending', 225.40),
    (121, '2023-02-04', 'Delivered', 505.95),
    (122, '2023-02-05', 'Processing', 340.25),
    (123, '2023-02-06', 'Shipped', 420.80),
    (124, '2023-02-07', 'Cancelled', 125.00),
    (125, '2023-02-08', 'Delivered', 590.45),
    (126, '2023-02-09', 'Processing', 310.70),
    (127, '2023-02-10', 'Shipped', 475.30),
    (128, '2023-02-11', 'Pending', 265.85),
    (129, '2023-02-12', 'Delivered', 535.20),
    (130, '2023-02-13', 'Processing', 395.65),
    (131, '2023-02-14', 'Shipped', 485.90),
    (132, '2023-02-15', 'Cancelled', 155.25),
    (133, '2023-02-16', 'Delivered', 625.40),
    (134, '2023-02-17', 'Processing', 355.75),
    (135, '2023-02-18', 'Shipped', 495.20),
    (136, '2023-02-19', 'Pending', 285.95),
    (137, '2023-02-20', 'Delivered', 565.30),
    (138, '2023-02-21', 'Processing', 415.85),
    (139, '2023-02-22', 'Shipped', 515.60),
    (140, '2023-02-23', 'Cancelled', 185.40),
    (141, '2023-02-24', 'Delivered', 655.75),
    (142, '2023-02-25', 'Processing', 435.90)
  `;

  const insertFirstReferencedTableData = `
    INSERT INTO ${connectionParams.schema}.${firstReferencedTableName} (order_id, product_name, quantity, price_per_unit) VALUES
    (1, 'Product A', 2, 50.00),
    (2, 'Product B', 3, 30.25),
    (3, 'Product C', 4, 75.00),
    (4, 'Product D', 5, 85.06),
    (5, 'Product E', 2, 94.99),
    (6, 'Product F', 1, 75.25),
    (7, 'Product G', 3, 183.33),
    (8, 'Product H', 6, 66.58),
    (9, 'Product I', 4, 68.95),
    (10, 'Product J', 7, 97.21),
    (11, 'Product K', 2, 160.07),
    (12, 'Product L', 5, 89.18),
    (13, 'Product M', 3, 66.66),
    (14, 'Product N', 4, 131.32),
    (15, 'Product O', 2, 144.87),
    (16, 'Product P', 1, 95.50),
    (17, 'Product Q', 6, 101.70),
    (18, 'Product R', 3, 125.28),
    (19, 'Product S', 5, 91.12),
    (20, 'Product T', 2, 112.70),
    (21, 'Product U', 4, 126.48),
    (22, 'Product V', 3, 113.41),
    (23, 'Product W', 5, 84.16),
    (24, 'Product X', 1, 125.00),
    (25, 'Product Y', 6, 98.40),
    (26, 'Product Z', 2, 155.35),
    (27, 'Product AA', 4, 118.82),
    (28, 'Product AB', 3, 88.61),
    (29, 'Product AC', 5, 107.04),
    (30, 'Product AD', 2, 197.82),
    (31, 'Product AE', 4, 121.47),
    (32, 'Product AF', 1, 155.25),
    (33, 'Product AG', 6, 104.23),
    (34, 'Product AH', 3, 118.58),
    (35, 'Product AI', 5, 99.04),
    (36, 'Product AJ', 2, 142.97),
    (37, 'Product AK', 4, 141.32),
    (38, 'Product AL', 3, 138.61),
    (39, 'Product AM', 5, 103.12),
    (40, 'Product AN', 1, 185.40),
    (41, 'Product AO', 6, 109.29),
    (42, 'Product AP', 2, 217.95)
  `;

  const insertSecondReferencedTableData = `
    INSERT INTO ${connectionParams.schema}.${referencedOnTableName} (order_id, shipped_date, carrier, tracking_number) VALUES
    (1, '2023-01-18', 'Carrier X', 'TRACK12345'),
    (3, '2023-01-20', 'Carrier Y', 'TRACK67890'),
    (5, '2023-01-22', 'Carrier X', 'TRACK11111'),
    (8, '2023-01-25', 'Carrier Z', 'TRACK22222'),
    (9, '2023-01-26', 'Carrier Y', 'TRACK33333'),
    (11, '2023-01-28', 'Carrier X', 'TRACK44444'),
    (12, '2023-01-29', 'Carrier Z', 'TRACK55555'),
    (15, '2023-02-01', 'Carrier Y', 'TRACK66666'),
    (17, '2023-02-03', 'Carrier X', 'TRACK77777'),
    (19, '2023-02-05', 'Carrier Z', 'TRACK88888'),
    (21, '2023-02-07', 'Carrier Y', 'TRACK99999'),
    (23, '2023-02-09', 'Carrier X', 'TRACK10101'),
    (25, '2023-02-11', 'Carrier Z', 'TRACK20202'),
    (27, '2023-02-13', 'Carrier Y', 'TRACK30303'),
    (29, '2023-02-15', 'Carrier X', 'TRACK40404'),
    (31, '2023-02-17', 'Carrier Z', 'TRACK50505'),
    (33, '2023-02-19', 'Carrier Y', 'TRACK60606'),
    (35, '2023-02-21', 'Carrier X', 'TRACK70707'),
    (37, '2023-02-23', 'Carrier Z', 'TRACK80808'),
    (39, '2023-02-25', 'Carrier Y', 'TRACK90909'),
    (41, '2023-02-27', 'Carrier X', 'TRACK11011'),
    (1, '2023-01-19', 'Carrier Y', 'TRACK11121'),
    (3, '2023-01-21', 'Carrier Z', 'TRACK11131'),
    (5, '2023-01-23', 'Carrier X', 'TRACK11141'),
    (8, '2023-01-26', 'Carrier Y', 'TRACK11151'),
    (9, '2023-01-27', 'Carrier Z', 'TRACK11161'),
    (11, '2023-01-29', 'Carrier Y', 'TRACK11171'),
    (12, '2023-01-30', 'Carrier X', 'TRACK11181'),
    (15, '2023-02-02', 'Carrier Z', 'TRACK11191'),
    (17, '2023-02-04', 'Carrier Y', 'TRACK11201'),
    (19, '2023-02-06', 'Carrier X', 'TRACK11211'),
    (21, '2023-02-08', 'Carrier Z', 'TRACK11221'),
    (23, '2023-02-10', 'Carrier Y', 'TRACK11231'),
    (25, '2023-02-12', 'Carrier X', 'TRACK11241'),
    (27, '2023-02-14', 'Carrier Z', 'TRACK11251'),
    (29, '2023-02-16', 'Carrier Y', 'TRACK11261'),
    (31, '2023-02-18', 'Carrier X', 'TRACK11271'),
    (33, '2023-02-20', 'Carrier Z', 'TRACK11281'),
    (35, '2023-02-22', 'Carrier Y', 'TRACK11291'),
    (37, '2023-02-24', 'Carrier X', 'TRACK11301'),
    (39, '2023-02-26', 'Carrier Z', 'TRACK11311'),
    (41, '2023-02-28', 'Carrier Y', 'TRACK11321')
  `;

  try {
    await ibmDatabase.query(insertMainTableData);
    await ibmDatabase.query(insertFirstReferencedTableData);
    await ibmDatabase.query(insertSecondReferencedTableData);
  } catch (error) {
    console.error(`Error while inserting data: ${error}`);
    console.info(`Insert Queries:
      ${insertMainTableData}
      ${insertFirstReferencedTableData}
      ${insertSecondReferencedTableData}
    `);
  }

  await ibmDatabase.close();

  return {
    main_table: {
      table_name: mainTableName,
      column_names: ['order_id', 'customer_id', 'order_date', 'status', 'total_amount'],
      foreign_key_column_names: [],
      binary_column_names: [],
      primary_key_column_names: ['order_id'],
    },
    first_referenced_table: {
      table_name: firstReferencedTableName,
      column_names: ['item_id', 'order_id', 'product_name', 'quantity', 'price_per_unit'],
      primary_key_column_names: ['item_id'],
    },
    second_referenced_table: {
      table_name: referencedOnTableName,
      column_names: ['shipment_id', 'order_id', 'shipped_date', 'carrier', 'tracking_number'],
      primary_key_column_names: ['shipment_id'],
      foreign_key_column_names: ['order_id'],
    },
  };
};
