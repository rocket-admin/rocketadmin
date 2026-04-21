import { faker } from '@faker-js/faker';
import { getTestKnex } from '../get-test-knex.js';

export type SimpleTypedKeyTableCreationResult = {
	main_table: {
		table_name: string;
		column_names: string[];
		primary_key_column_names: string[];
		primary_key_type: 'uuid' | 'date' | 'integer';
		sample_primary_key_values: any[];
	};
	first_referenced_table: {
		table_name: string;
		column_names: string[];
		primary_key_column_names: string[];
		foreign_key_column_names: string[];
	};
};

export type CompositeTypedKeyTableCreationResult = {
	main_table: {
		table_name: string;
		column_names: string[];
		primary_key_column_names: string[];
		primary_key_types: Array<'uuid' | 'date' | 'integer'>;
		sample_primary_key_rows: Array<Record<string, any>>;
	};
	first_referenced_table: {
		table_name: string;
		column_names: string[];
		primary_key_column_names: string[];
		foreign_key_column_names: string[];
	};
};

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

export const createTestTablesWithSimpleAutoIncrementKeys = async (
	connectionParams: any,
): Promise<SimpleTypedKeyTableCreationResult> => {
	const connectionParamsCopy = { ...connectionParams };
	if (connectionParams.type === 'mysql') {
		connectionParamsCopy.type = 'mysql2';
	}
	const knex = getTestKnex(connectionParamsCopy);

	const mainTableName = 'Products_AutoInc_Simple';
	const firstReferencedTableName = 'ProductReviews_AutoInc_Simple';

	await knex.schema.dropTableIfExists(firstReferencedTableName);
	await knex.schema.dropTableIfExists(mainTableName);

	await knex.schema.createTable(mainTableName, (table) => {
		table.increments('product_id').primary();
		table.string('product_name', 100);
		table.string('sku', 50);
		table.decimal('price', 10, 2);
	});

	await knex.schema.createTable(firstReferencedTableName, (table) => {
		table.increments('review_id').primary();
		table.integer('product_id').notNullable();
		table.integer('rating');
		table.text('comment');
		table.foreign('product_id').references('product_id').inTable(mainTableName);
	});

	const testEntitiesCount = 20;
	const mainTableInserts: Array<{ product_name: string; sku: string; price: number }> = [];

	for (let i = 0; i < testEntitiesCount; i++) {
		mainTableInserts.push({
			product_name: faker.commerce.productName(),
			sku: `SKU-${faker.string.alphanumeric(8).toUpperCase()}`,
			price: parseFloat(faker.commerce.price({ min: 5, max: 1000, dec: 2 })),
		});
	}

	const insertedProductIds = await knex(mainTableName).insert(mainTableInserts).returning('product_id');
	const productIds = insertedProductIds.map((r: any) => (typeof r === 'object' ? r.product_id : r));

	const firstReferencedTableInserts: Array<{
		product_id: number;
		rating: number;
		comment: string;
	}> = [];
	for (let i = 0; i < testEntitiesCount; i++) {
		firstReferencedTableInserts.push({
			product_id: productIds[i],
			rating: faker.number.int({ min: 1, max: 5 }),
			comment: faker.lorem.sentence(),
		});
	}
	await knex(firstReferencedTableName).insert(firstReferencedTableInserts);

	const mainColumnData = await knex(mainTableName).columnInfo();
	const firstReferencedColumnData = await knex(firstReferencedTableName).columnInfo();

	return {
		main_table: {
			table_name: mainTableName,
			column_names: Object.keys(mainColumnData),
			primary_key_column_names: ['product_id'],
			primary_key_type: 'integer',
			sample_primary_key_values: productIds.slice(0, 5),
		},
		first_referenced_table: {
			table_name: firstReferencedTableName,
			column_names: Object.keys(firstReferencedColumnData),
			primary_key_column_names: ['review_id'],
			foreign_key_column_names: ['product_id'],
		},
	};
};

export const createTestTablesWithSimpleUUIDKeys = async (
	connectionParams: any,
): Promise<SimpleTypedKeyTableCreationResult> => {
	const connectionParamsCopy = { ...connectionParams };
	if (connectionParams.type === 'mysql') {
		connectionParamsCopy.type = 'mysql2';
	}
	const knex = getTestKnex(connectionParamsCopy);

	const mainTableName = 'Users_UUID_Simple';
	const firstReferencedTableName = 'Posts_UUID_Simple';

	await knex.schema.dropTableIfExists(firstReferencedTableName);
	await knex.schema.dropTableIfExists(mainTableName);

	await knex.schema.createTable(mainTableName, (table) => {
		table.uuid('user_id').primary();
		table.string('name', 100);
		table.string('email', 100);
	});

	await knex.schema.createTable(firstReferencedTableName, (table) => {
		table.uuid('post_id').primary();
		table.uuid('user_id').notNullable();
		table.string('title', 150);
		table.text('content');
		table.foreign('user_id').references('user_id').inTable(mainTableName);
	});

	const testEntitiesCount = 20;
	const mainTableInserts: Array<{ user_id: string; name: string; email: string }> = [];
	const firstReferencedTableInserts: Array<{
		post_id: string;
		user_id: string;
		title: string;
		content: string;
	}> = [];

	for (let i = 0; i < testEntitiesCount; i++) {
		const userId = faker.string.uuid();
		mainTableInserts.push({
			user_id: userId,
			name: faker.person.fullName(),
			email: faker.internet.email(),
		});
		firstReferencedTableInserts.push({
			post_id: faker.string.uuid(),
			user_id: userId,
			title: faker.lorem.sentence(),
			content: faker.lorem.paragraph(),
		});
	}

	await knex(mainTableName).insert(mainTableInserts);
	await knex(firstReferencedTableName).insert(firstReferencedTableInserts);

	const mainColumnData = await knex(mainTableName).columnInfo();
	const firstReferencedColumnData = await knex(firstReferencedTableName).columnInfo();

	return {
		main_table: {
			table_name: mainTableName,
			column_names: Object.keys(mainColumnData),
			primary_key_column_names: ['user_id'],
			primary_key_type: 'uuid',
			sample_primary_key_values: mainTableInserts.slice(0, 5).map((r) => r.user_id),
		},
		first_referenced_table: {
			table_name: firstReferencedTableName,
			column_names: Object.keys(firstReferencedColumnData),
			primary_key_column_names: ['post_id'],
			foreign_key_column_names: ['user_id'],
		},
	};
};

export const createTestTablesWithSimpleDateKeys = async (
	connectionParams: any,
): Promise<SimpleTypedKeyTableCreationResult> => {
	const connectionParamsCopy = { ...connectionParams };
	if (connectionParams.type === 'mysql') {
		connectionParamsCopy.type = 'mysql2';
	}
	const knex = getTestKnex(connectionParamsCopy);

	const mainTableName = 'Events_Date_Simple';
	const firstReferencedTableName = 'EventLogs_Date_Simple';

	await knex.schema.dropTableIfExists(firstReferencedTableName);
	await knex.schema.dropTableIfExists(mainTableName);

	await knex.schema.createTable(mainTableName, (table) => {
		table.date('event_date').primary();
		table.string('name', 100);
		table.string('description', 255);
	});

	await knex.schema.createTable(firstReferencedTableName, (table) => {
		table.increments('log_id').primary();
		table.date('event_date').notNullable();
		table.string('message', 255);
		table.foreign('event_date').references('event_date').inTable(mainTableName);
	});

	const testEntitiesCount = 20;
	const baseDate = new Date('2025-01-01T00:00:00Z');
	const mainTableInserts: Array<{ event_date: string; name: string; description: string }> = [];
	const firstReferencedTableInserts: Array<{ event_date: string; message: string }> = [];
	const sampleDates: string[] = [];

	for (let i = 0; i < testEntitiesCount; i++) {
		const date = new Date(baseDate);
		date.setUTCDate(baseDate.getUTCDate() + i);
		const dateStr = date.toISOString().split('T')[0];
		sampleDates.push(dateStr);
		mainTableInserts.push({
			event_date: dateStr,
			name: faker.lorem.words(2),
			description: faker.lorem.sentence(),
		});
		firstReferencedTableInserts.push({
			event_date: dateStr,
			message: faker.lorem.sentence(),
		});
	}

	await knex(mainTableName).insert(mainTableInserts);
	await knex(firstReferencedTableName).insert(firstReferencedTableInserts);

	const mainColumnData = await knex(mainTableName).columnInfo();
	const firstReferencedColumnData = await knex(firstReferencedTableName).columnInfo();

	return {
		main_table: {
			table_name: mainTableName,
			column_names: Object.keys(mainColumnData),
			primary_key_column_names: ['event_date'],
			primary_key_type: 'date',
			sample_primary_key_values: sampleDates.slice(0, 5),
		},
		first_referenced_table: {
			table_name: firstReferencedTableName,
			column_names: Object.keys(firstReferencedColumnData),
			primary_key_column_names: ['log_id'],
			foreign_key_column_names: ['event_date'],
		},
	};
};

export const createTestTablesWithCompositeUUIDKeys = async (
	connectionParams: any,
): Promise<CompositeTypedKeyTableCreationResult> => {
	const connectionParamsCopy = { ...connectionParams };
	if (connectionParams.type === 'mysql') {
		connectionParamsCopy.type = 'mysql2';
	}
	const knex = getTestKnex(connectionParamsCopy);

	const mainTableName = 'Accounts_UUID_Composite';
	const firstReferencedTableName = 'AccountActivities_UUID_Composite';

	await knex.schema.dropTableIfExists(firstReferencedTableName);
	await knex.schema.dropTableIfExists(mainTableName);

	await knex.schema.createTable(mainTableName, (table) => {
		table.uuid('account_id').notNullable();
		table.uuid('tenant_id').notNullable();
		table.string('account_name', 100);
		table.decimal('balance', 12, 2);
		table.primary(['account_id', 'tenant_id']);
	});

	await knex.schema.createTable(firstReferencedTableName, (table) => {
		table.increments('activity_id').primary();
		table.uuid('account_id').notNullable();
		table.uuid('tenant_id').notNullable();
		table.string('activity_type', 50);
		table.decimal('amount', 10, 2);
		table.foreign(['account_id', 'tenant_id']).references(['account_id', 'tenant_id']).inTable(mainTableName);
	});

	const testEntitiesCount = 20;
	const mainTableInserts: Array<{
		account_id: string;
		tenant_id: string;
		account_name: string;
		balance: number;
	}> = [];
	const firstReferencedTableInserts: Array<{
		account_id: string;
		tenant_id: string;
		activity_type: string;
		amount: number;
	}> = [];
	const sampleRows: Array<{ account_id: string; tenant_id: string }> = [];

	for (let i = 0; i < testEntitiesCount; i++) {
		const accountId = faker.string.uuid();
		const tenantId = faker.string.uuid();
		sampleRows.push({ account_id: accountId, tenant_id: tenantId });
		mainTableInserts.push({
			account_id: accountId,
			tenant_id: tenantId,
			account_name: faker.company.name(),
			balance: parseFloat(faker.commerce.price({ min: 100, max: 10000, dec: 2 })),
		});
		firstReferencedTableInserts.push({
			account_id: accountId,
			tenant_id: tenantId,
			activity_type: faker.helpers.arrayElement(['deposit', 'withdrawal', 'transfer', 'fee']),
			amount: parseFloat(faker.commerce.price({ min: 1, max: 1000, dec: 2 })),
		});
	}

	await knex(mainTableName).insert(mainTableInserts);
	await knex(firstReferencedTableName).insert(firstReferencedTableInserts);

	const mainColumnData = await knex(mainTableName).columnInfo();
	const firstReferencedColumnData = await knex(firstReferencedTableName).columnInfo();

	return {
		main_table: {
			table_name: mainTableName,
			column_names: Object.keys(mainColumnData),
			primary_key_column_names: ['account_id', 'tenant_id'],
			primary_key_types: ['uuid', 'uuid'],
			sample_primary_key_rows: sampleRows.slice(0, 5),
		},
		first_referenced_table: {
			table_name: firstReferencedTableName,
			column_names: Object.keys(firstReferencedColumnData),
			primary_key_column_names: ['activity_id'],
			foreign_key_column_names: ['account_id', 'tenant_id'],
		},
	};
};

export const createTestTablesWithCompositeUUIDIntKeys = async (
	connectionParams: any,
): Promise<CompositeTypedKeyTableCreationResult> => {
	const connectionParamsCopy = { ...connectionParams };
	if (connectionParams.type === 'mysql') {
		connectionParamsCopy.type = 'mysql2';
	}
	const knex = getTestKnex(connectionParamsCopy);

	const mainTableName = 'Sessions_UUIDInt_Composite';
	const firstReferencedTableName = 'SessionEvents_UUIDInt_Composite';

	await knex.schema.dropTableIfExists(firstReferencedTableName);
	await knex.schema.dropTableIfExists(mainTableName);

	await knex.schema.createTable(mainTableName, (table) => {
		table.uuid('session_token').notNullable();
		table.integer('user_id').notNullable();
		table.timestamp('started_at').defaultTo(knex.fn.now());
		table.string('device', 100);
		table.primary(['session_token', 'user_id']);
	});

	await knex.schema.createTable(firstReferencedTableName, (table) => {
		table.increments('event_id').primary();
		table.uuid('session_token').notNullable();
		table.integer('user_id').notNullable();
		table.string('event_type', 50);
		table.text('payload');
		table.foreign(['session_token', 'user_id']).references(['session_token', 'user_id']).inTable(mainTableName);
	});

	const testEntitiesCount = 20;
	const mainTableInserts: Array<{
		session_token: string;
		user_id: number;
		device: string;
	}> = [];
	const firstReferencedTableInserts: Array<{
		session_token: string;
		user_id: number;
		event_type: string;
		payload: string;
	}> = [];
	const sampleRows: Array<{ session_token: string; user_id: number }> = [];

	for (let i = 0; i < testEntitiesCount; i++) {
		const sessionToken = faker.string.uuid();
		const userId = 1000 + i;
		sampleRows.push({ session_token: sessionToken, user_id: userId });
		mainTableInserts.push({
			session_token: sessionToken,
			user_id: userId,
			device: faker.helpers.arrayElement(['iOS', 'Android', 'Web', 'Desktop']),
		});
		firstReferencedTableInserts.push({
			session_token: sessionToken,
			user_id: userId,
			event_type: faker.helpers.arrayElement(['login', 'click', 'submit', 'logout']),
			payload: faker.lorem.sentence(),
		});
	}

	await knex(mainTableName).insert(mainTableInserts);
	await knex(firstReferencedTableName).insert(firstReferencedTableInserts);

	const mainColumnData = await knex(mainTableName).columnInfo();
	const firstReferencedColumnData = await knex(firstReferencedTableName).columnInfo();

	return {
		main_table: {
			table_name: mainTableName,
			column_names: Object.keys(mainColumnData),
			primary_key_column_names: ['session_token', 'user_id'],
			primary_key_types: ['uuid', 'integer'],
			sample_primary_key_rows: sampleRows.slice(0, 5),
		},
		first_referenced_table: {
			table_name: firstReferencedTableName,
			column_names: Object.keys(firstReferencedColumnData),
			primary_key_column_names: ['event_id'],
			foreign_key_column_names: ['session_token', 'user_id'],
		},
	};
};

export const createTestTablesWithCompositeDateIntKeys = async (
	connectionParams: any,
): Promise<CompositeTypedKeyTableCreationResult> => {
	const connectionParamsCopy = { ...connectionParams };
	if (connectionParams.type === 'mysql') {
		connectionParamsCopy.type = 'mysql2';
	}
	const knex = getTestKnex(connectionParamsCopy);

	const mainTableName = 'DailyStats_DateInt_Composite';
	const firstReferencedTableName = 'DailyStatEntries_DateInt_Composite';

	await knex.schema.dropTableIfExists(firstReferencedTableName);
	await knex.schema.dropTableIfExists(mainTableName);

	await knex.schema.createTable(mainTableName, (table) => {
		table.date('stat_date').notNullable();
		table.integer('category_id').notNullable();
		table.integer('total_count');
		table.decimal('total_value', 12, 2);
		table.primary(['stat_date', 'category_id']);
	});

	await knex.schema.createTable(firstReferencedTableName, (table) => {
		table.increments('entry_id').primary();
		table.date('stat_date').notNullable();
		table.integer('category_id').notNullable();
		table.string('description', 150);
		table.decimal('value', 10, 2);
		table.foreign(['stat_date', 'category_id']).references(['stat_date', 'category_id']).inTable(mainTableName);
	});

	const testEntitiesCount = 20;
	const baseDate = new Date('2025-06-01T00:00:00Z');
	const mainTableInserts: Array<{
		stat_date: string;
		category_id: number;
		total_count: number;
		total_value: number;
	}> = [];
	const firstReferencedTableInserts: Array<{
		stat_date: string;
		category_id: number;
		description: string;
		value: number;
	}> = [];
	const sampleRows: Array<{ stat_date: string; category_id: number }> = [];

	for (let i = 0; i < testEntitiesCount; i++) {
		const date = new Date(baseDate);
		date.setUTCDate(baseDate.getUTCDate() + i);
		const dateStr = date.toISOString().split('T')[0];
		const categoryId = 500 + i;
		sampleRows.push({ stat_date: dateStr, category_id: categoryId });
		mainTableInserts.push({
			stat_date: dateStr,
			category_id: categoryId,
			total_count: faker.number.int({ min: 10, max: 500 }),
			total_value: parseFloat(faker.commerce.price({ min: 100, max: 5000, dec: 2 })),
		});
		firstReferencedTableInserts.push({
			stat_date: dateStr,
			category_id: categoryId,
			description: faker.lorem.words(3),
			value: parseFloat(faker.commerce.price({ min: 1, max: 100, dec: 2 })),
		});
	}

	await knex(mainTableName).insert(mainTableInserts);
	await knex(firstReferencedTableName).insert(firstReferencedTableInserts);

	const mainColumnData = await knex(mainTableName).columnInfo();
	const firstReferencedColumnData = await knex(firstReferencedTableName).columnInfo();

	return {
		main_table: {
			table_name: mainTableName,
			column_names: Object.keys(mainColumnData),
			primary_key_column_names: ['stat_date', 'category_id'],
			primary_key_types: ['date', 'integer'],
			sample_primary_key_rows: sampleRows.slice(0, 5),
		},
		first_referenced_table: {
			table_name: firstReferencedTableName,
			column_names: Object.keys(firstReferencedColumnData),
			primary_key_column_names: ['entry_id'],
			foreign_key_column_names: ['stat_date', 'category_id'],
		},
	};
};
