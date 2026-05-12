/* eslint-disable @typescript-eslint/no-unused-vars */

import { BatchWriteItemCommand, DynamoDB, PutItemCommand, PutItemCommandInput } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createClient as createClickHouseClient } from '@clickhouse/client';
import { Client } from '@elastic/elasticsearch';
import { faker } from '@faker-js/faker';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import * as cassandra from 'cassandra-driver';
import ibmdb from 'ibm_db';
import { MongoClient } from 'mongodb';
import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import { getRandomConstraintName, getRandomTestTableName } from './get-random-test-table-name.js';
import { getTestKnex } from './get-test-knex.js';

export async function createTestTable(
	connectionParams: any,
	testEntitiesSeedsCount = 42,
	testSearchedUserName = 'Vasia',
	withJsonField = false,
	withWidgetsData = false,
): Promise<CreatedTableInfo> {
	if (connectionParams.type === ConnectionTypesEnum.ibmdb2) {
		return createTestTableIbmDb2(connectionParams, testEntitiesSeedsCount, testSearchedUserName);
	}

	if (connectionParams.type === ConnectionTypesEnum.mongodb) {
		return createTestMongoTable(connectionParams, testEntitiesSeedsCount, testSearchedUserName);
	}

	if (connectionParams.type === ConnectionTypesEnum.elasticsearch) {
		return createTestElasticsearchTable(connectionParams, testEntitiesSeedsCount, testSearchedUserName);
	}

	if (connectionParams.type === ConnectionTypesEnum.cassandra) {
		return createTestCassandraTable(connectionParams, testEntitiesSeedsCount, testSearchedUserName);
	}

	if (connectionParams.type === ConnectionTypesEnum.dynamodb) {
		return createTestDynamoDBTable(connectionParams, testEntitiesSeedsCount, testSearchedUserName);
	}

	if (connectionParams.type === ConnectionTypesEnum.redis) {
		return createTestRedisTable(connectionParams, testEntitiesSeedsCount, testSearchedUserName);
	}

	if (connectionParams.type === ConnectionTypesEnum.clickhouse) {
		return createTestClickHouseTable(connectionParams, testEntitiesSeedsCount, testSearchedUserName);
	}

	const testTableName = getRandomTestTableName();
	const testTableColumnName = `${faker.lorem.words(1)}_${faker.lorem.words(1)}`;
	const testTableSecondColumnName = `${faker.lorem.words(1)}_${faker.lorem.words(1)}`;
	const connectionParamsCopy = {
		...connectionParams,
	};
	if (connectionParams.type === 'mysql') {
		connectionParamsCopy.type = 'mysql2';
	}
	const Knex = getTestKnex(connectionParamsCopy);
	// await Knex.schema.dropTableIfExists(testTableName);
	await Knex.schema.createTable(testTableName, (table) => {
		table.increments();
		table.string(testTableColumnName);
		table.string(testTableSecondColumnName);
		table.timestamps();
	});

	if (withJsonField) {
		await Knex.schema.table(testTableName, (table) => {
			table.json('json_field');
			table.jsonb('jsonb_field');
		});
	}

	// telephoneColumns,
	// uuidColumns,
	// countryCodeColumns,
	// urlColumns,
	// rgbColorColumns,
	// hexColorColumns,
	// hslColorColumns,
	// email columns already exists as some of the test columns
	if (withWidgetsData) {
		await Knex.schema.table(testTableName, (table) => {
			table.string('telephone');
			table.string('uuid');
			table.string('countryCode');
			table.string('url');
			table.string('rgbColor');
			table.string('hexColor');
			table.string('hslColor');
		});
	}

	const rowsToInsert: Array<Record<string, unknown>> = [];
	for (let i = 0; i < testEntitiesSeedsCount; i++) {
		const widgetsDataObject: any = {};
		if (withWidgetsData) {
			widgetsDataObject.telephone = faker.phone.number({ style: 'international' });
			widgetsDataObject.uuid = faker.string.uuid();
			widgetsDataObject.countryCode = faker.location.countryCode();
			widgetsDataObject.url = faker.internet.url();
			widgetsDataObject.rgbColor = faker.color.rgb();
			widgetsDataObject.hexColor = faker.color.rgb({ format: 'hex', casing: 'lower' });
			widgetsDataObject.hslColor = faker.color.hsl({ format: 'css' });
		}
		if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
			rowsToInsert.push({
				[testTableColumnName]: testSearchedUserName,
				[testTableSecondColumnName]: faker.internet.email(),
				created_at: new Date(),
				updated_at: new Date(),
				...widgetsDataObject,
			});
		} else {
			rowsToInsert.push({
				[testTableColumnName]: faker.person.firstName(),
				[testTableSecondColumnName]: faker.internet.email(),
				created_at: new Date(),
				updated_at: new Date(),
				...widgetsDataObject,
			});
		}
	}
	await Knex.batchInsert(testTableName, rowsToInsert, 100);
	return {
		testTableName: testTableName,
		testTableColumnName: testTableColumnName,
		testTableSecondColumnName: testTableSecondColumnName,
		testEntitiesSeedsCount: testEntitiesSeedsCount,
	};
}

async function createTestElasticsearchTable(
	connectionParams,
	testEntitiesSeedsCount = 42,
	testSearchedUserName = 'Vasia',
): Promise<CreatedTableInfo> {
	const testTableName = getRandomTestTableName().toLowerCase();
	const testTableColumnName = `${faker.lorem.words(1)}_${faker.lorem.words(1)}`;
	const testTableSecondColumnName = `${faker.lorem.words(1)}_${faker.lorem.words(1)}`;
	const { host, port, username, password } = connectionParams;
	const protocol = 'http';
	const node = `${protocol}://${host}:${port}`;
	const options: any = {
		node,
		auth: {
			username,
			password,
		},
	};
	const client = new Client(options);
	const _response = await client.indices.create({
		index: testTableName,
	});
	await client.indices.putMapping({
		index: testTableName,
		dynamic: 'runtime',
		properties: {
			[testTableColumnName]: {
				type: 'text',
			},
			[testTableSecondColumnName]: {
				type: 'text',
			},
		},
	});
	const bulkOperations: Array<Record<string, unknown>> = [];
	for (let i = 0; i < testEntitiesSeedsCount; i++) {
		bulkOperations.push({ index: { _index: testTableName } });
		if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
			bulkOperations.push({
				[testTableColumnName]: testSearchedUserName,
				[testTableSecondColumnName]: faker.internet.email(),
				created_at: new Date(),
				updated_at: new Date(),
				age: i === 0 ? 14 : i === testEntitiesSeedsCount - 21 ? 90 : 95,
			});
		} else {
			bulkOperations.push({
				[testTableColumnName]: faker.person.firstName(),
				[testTableSecondColumnName]: faker.internet.email(),
				created_at: new Date(),
				updated_at: new Date(),
				age: faker.number.int({ min: 16, max: 80 }),
			});
		}
	}
	const bulkResponse = await client.bulk({ refresh: true, operations: bulkOperations });
	const insertedSearchedIds: Array<{
		number: number;
		_id: string;
	}> = [];
	const bulkItems = (bulkResponse as { items: Array<{ index?: { _id?: string } }> }).items;
	for (let i = 0; i < testEntitiesSeedsCount; i++) {
		insertedSearchedIds.push({
			number: i,
			_id: bulkItems[i]?.index?._id ?? '',
		});
	}
	return {
		testTableName: testTableName,
		testTableColumnName: testTableColumnName,
		testTableSecondColumnName: testTableSecondColumnName,
		testEntitiesSeedsCount: testEntitiesSeedsCount,
		insertedSearchedIds,
	};
}

async function createTestTableIbmDb2(
	connectionParams: any,
	testEntitiesSeedsCount = 42,
	testSearchedUserName = 'Vasia',
): Promise<CreatedTableInfo> {
	const testTableName = getRandomTestTableName().toUpperCase();
	const testTableColumnName = `${faker.lorem.words(1)}_${faker.lorem.words(1)}`.replace(/[-@]/g, '').toUpperCase();
	const testTableSecondColumnName = `${faker.lorem.words(1)}_${faker.lorem.words(1)}`
		.replace(/[-@]/g, '')
		.toUpperCase();
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

	const queryCheckTableExists = `SELECT COUNT(*) FROM SYSCAT.TABLES WHERE TABNAME = '${testTableName}' AND TABSCHEMA = '${connectionParams.schema}'`;
	const tableExists = await ibmDatabase.query(queryCheckTableExists);

	if (tableExists.length && tableExists[0]['1']) {
		await ibmDatabase.query(`DROP TABLE ${connectionParams.schema}.${testTableName}`);
	}

	const query = `
  CREATE TABLE ${connectionParams.schema}.${testTableName} (
    id INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY (START WITH 1, INCREMENT BY 1),
    ${testTableColumnName} VARCHAR(255),
    ${testTableSecondColumnName} VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT TIMESTAMP,
    PRIMARY KEY (id)
)`;

	try {
		await ibmDatabase.query(query);
	} catch (error) {
		console.error(`Error while creating table: ${error}`);
		console.info(`Query: ${query}`);
	}

	const valueTuples: Array<string> = [];
	for (let i = 0; i < testEntitiesSeedsCount; i++) {
		if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
			valueTuples.push(
				`('${testSearchedUserName}', '${faker.internet.email().replace(/["']/g, '')}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			);
		} else {
			valueTuples.push(
				`('${faker.person.firstName().replace(/["']/g, '')}', '${faker.internet.email().replace(/["']/g, '')}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			);
		}
	}
	if (valueTuples.length > 0) {
		const batchSize = 100;
		for (let start = 0; start < valueTuples.length; start += batchSize) {
			const chunk = valueTuples.slice(start, start + batchSize);
			await ibmDatabase.query(
				`INSERT INTO ${connectionParams.schema}.${testTableName} (${testTableColumnName}, ${testTableSecondColumnName}, created_at, updated_at) VALUES ${chunk.join(', ')}`,
			);
		}
	}

	return {
		testTableName: testTableName,
		testTableColumnName: testTableColumnName,
		testTableSecondColumnName: testTableSecondColumnName,
		testEntitiesSeedsCount: testEntitiesSeedsCount,
	};
}

async function createTestMongoTable(
	connectionParams,
	testEntitiesSeedsCount,
	testSearchedUserName,
): Promise<CreatedTableInfo> {
	const testTableName = getRandomTestTableName();
	const testTableColumnName = `${faker.lorem.words(1)}_${faker.lorem.words(1)}`;
	const testTableSecondColumnName = `${faker.lorem.words(1)}_${faker.lorem.words(1)}`;

	const mongoConnectionString =
		`mongodb://${connectionParams.username}` +
		`:${connectionParams.password}` +
		`@${connectionParams.host}` +
		`:${connectionParams.port}` +
		`/${connectionParams.database}`;

	const client = new MongoClient(mongoConnectionString);
	await client.connect();
	const db = client.db(connectionParams.database);
	const collection = db.collection(testTableName);

	await collection.drop();
	const docsToInsert: Array<Record<string, unknown>> = [];
	for (let i = 0; i < testEntitiesSeedsCount; i++) {
		if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
			docsToInsert.push({
				[testTableColumnName]: testSearchedUserName,
				[testTableSecondColumnName]: faker.internet.email(),
				created_at: new Date(),
				updated_at: new Date(),
				age: i === 0 ? 14 : i === testEntitiesSeedsCount - 21 ? 90 : 95,
			});
		} else {
			docsToInsert.push({
				[testTableColumnName]: faker.person.firstName(),
				[testTableSecondColumnName]: faker.internet.email(),
				created_at: new Date(),
				updated_at: new Date(),
				age: faker.number.int({ min: 16, max: 80 }),
			});
		}
	}
	const insertManyResult = await collection.insertMany(docsToInsert, { ordered: true });
	const insertedSearchedIds: Array<{ number: number; _id: string }> = [];
	for (let i = 0; i < testEntitiesSeedsCount; i++) {
		const insertedId = insertManyResult.insertedIds[i];
		insertedSearchedIds.push({
			number: i,
			_id: insertedId.toHexString(),
		});
	}
	return {
		testTableName: testTableName,
		testTableColumnName: testTableColumnName,
		testTableSecondColumnName: testTableSecondColumnName,
		testEntitiesSeedsCount: testEntitiesSeedsCount,
		insertedSearchedIds,
	};
}

export type CreatedTableInfo = {
	testTableName: string;
	testTableColumnName: string;
	testTableSecondColumnName: string;
	testEntitiesSeedsCount: number;
	insertedSearchedIds?: Array<{ number: number; _id?: string; id?: string }>;
};

export async function createTestTableForMSSQLWithChema(
	connectionParams,
	testEntitiesSeedsCount = 42,
	testSearchedUserName = 'Vasia',
	_schemaName = 'test_chema',
) {
	const testTableName = getRandomTestTableName();
	const testTableColumnName = `${faker.lorem.words(1)}_${faker.lorem.words(1)}`;
	const testTableSecondColumnName = `${faker.lorem.words(1)}_${faker.lorem.words(1)}`;
	const Knex = getTestKnex(connectionParams);
	try {
		await Knex.raw(`IF NOT EXISTS ( SELECT  *
      FROM    sys.schemas
      WHERE   name = N'test_schema' )
EXEC('CREATE SCHEMA [test_schema]');`);
	} catch (e) {
		console.error(`MSSQL: Error while creating schema: ${e}`);
	}

	await Knex.schema.dropTableIfExists(`test_schema.${testTableName}`);
	await Knex.schema.createTable(`test_schema.${testTableName}`, (table) => {
		table.increments();
		table.string(testTableColumnName);
		table.string(testTableSecondColumnName);
		table.timestamps();
	});

	const rowsToInsert: Array<Record<string, unknown>> = [];
	for (let i = 0; i < testEntitiesSeedsCount; i++) {
		if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
			rowsToInsert.push({
				[testTableColumnName]: testSearchedUserName,
				[testTableSecondColumnName]: faker.internet.email(),
				created_at: new Date(),
				updated_at: new Date(),
			});
		} else {
			rowsToInsert.push({
				[testTableColumnName]: faker.person.firstName(),
				[testTableSecondColumnName]: faker.internet.email(),
				created_at: new Date(),
				updated_at: new Date(),
			});
		}
	}
	await Knex(testTableName).withSchema('test_schema').insert(rowsToInsert);
	return {
		testTableName: testTableName,
		testTableColumnName: testTableColumnName,
		testTableSecondColumnName: testTableSecondColumnName,
		testEntitiesSeedsCount: testEntitiesSeedsCount,
	};
}

export async function createTestOracleTable(
	connectionParams,
	testEntitiesSeedsCount = 42,
	testSearchedUserName = 'Vasia',
) {
	const primaryKeyConstraintName = getRandomConstraintName();
	const pColumnName = 'id';
	const testTableColumnName = 'name';
	const testTableSecondColumnName = 'email';
	const { shema, username } = connectionParams;
	const testTableName = getRandomTestTableName().toUpperCase();
	const Knex = getTestKnex(connectionParams);
	await Knex.schema.dropTableIfExists(testTableName);
	await Knex.schema.createTable(testTableName, (table) => {
		table.integer(pColumnName);
		table.string(testTableColumnName);
		table.string(testTableSecondColumnName);
		table.timestamp('created_at');
		table.date('updated_at');
	});
	await Knex.schema.alterTable(testTableName, (t) => {
		t.primary([pColumnName], primaryKeyConstraintName);
	});
	const rowsToInsert: Array<Record<string, unknown>> = [];
	let counter = 0;
	if (shema) {
		for (let i = 0; i < testEntitiesSeedsCount; i++) {
			if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
				rowsToInsert.push({
					[pColumnName]: ++counter,
					[testTableColumnName]: testSearchedUserName,
					[testTableSecondColumnName]: faker.internet.email(),
					created_at: new Date(),
					updated_at: new Date(),
				});
			} else {
				rowsToInsert.push({
					[pColumnName]: ++counter,
					[testTableColumnName]: faker.person.firstName(),
					[testTableSecondColumnName]: faker.internet.email(),
					created_at: new Date(),
					updated_at: new Date(),
				});
			}
		}
		await Knex(testTableName).withSchema(username.toUpperCase()).insert(rowsToInsert);
	} else {
		for (let i = 0; i < testEntitiesSeedsCount; i++) {
			if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
				rowsToInsert.push({
					[pColumnName]: ++counter,
					[testTableColumnName]: testSearchedUserName,
					[testTableSecondColumnName]: faker.internet.email(),
					created_at: new Date('2010-11-03'),
					updated_at: new Date(),
				});
			} else {
				rowsToInsert.push({
					[pColumnName]: ++counter,
					[testTableColumnName]: faker.person.firstName(),
					[testTableSecondColumnName]: faker.internet.email(),
					created_at: new Date(),
					updated_at: new Date(),
				});
			}
		}
		await Knex(testTableName).insert(rowsToInsert);
	}
	return {
		testTableName: testTableName,
		testTableColumnName: testTableColumnName,
		testTableSecondColumnName: testTableSecondColumnName,
		testEntitiesSeedsCount: testEntitiesSeedsCount,
	};
}

export async function createTestOracleTableWithDifferentData(
	connectionParams,
	testEntitiesSeedsCount = 42,
	testSearchedUserName = 'Vasia',
) {
	const _primaryKeyConstraintName = getRandomConstraintName();
	const _pColumnName = 'id';
	const _testTableColumnName = 'name';
	const _testTableSecondColumnName = 'email';
	const { shema, username } = connectionParams;
	const testTableName = getRandomTestTableName().toUpperCase();
	const Knex = getTestKnex(connectionParams);
	await Knex.schema.dropTableIfExists(testTableName);

	await Knex.schema.createTable(testTableName, (table) => {
		table.specificType('patient_id', 'RAW(16) DEFAULT SYS_GUID()').primary();
		table.string('first_name', 100).notNullable();
		table.string('last_name', 100).notNullable();
		table.date('date_of_birth').notNullable();
		table.specificType('gender', 'CHAR(1)');
		table.string('phone_number', 40);
		table.string('email', 150).unique();
		table.string('address', 300);
		table.specificType('insurance_info', 'CLOB'); // Using specificType for CLOB
		table.timestamp('created_at').defaultTo(Knex.raw('SYSTIMESTAMP'));
	});

	try {
		await Knex.raw(
			`ALTER TABLE ${testTableName} ADD CONSTRAINT chk_gender_${testTableName} CHECK ("gender" IN ('M','F','O'))`,
		);
	} catch (_error) {
		console.log('Warning: Could not add CHECK constraint for gender field');
	}

	const rowsToInsert: Array<Record<string, unknown>> = [];
	for (let i = 0; i < testEntitiesSeedsCount; i++) {
		if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
			rowsToInsert.push({
				first_name: testSearchedUserName,
				last_name: faker.person.lastName(),
				date_of_birth: faker.date.past(),
				gender: faker.helpers.arrayElement(['M', 'F', 'O']),
				phone_number: faker.phone.number(),
				email: faker.internet.email(),
				address: faker.location.streetAddress(),
				insurance_info: faker.lorem.sentence(),
			});
		} else {
			rowsToInsert.push({
				first_name: faker.person.firstName(),
				last_name: faker.person.lastName(),
				date_of_birth: faker.date.past(),
				gender: faker.helpers.arrayElement(['M', 'F', 'O']),
				phone_number: faker.phone.number(),
				email: faker.internet.email(),
				address: faker.location.streetAddress(),
				insurance_info: faker.lorem.sentence(),
			});
		}
	}
	if (shema) {
		await Knex(testTableName).withSchema(username.toUpperCase()).insert(rowsToInsert);
	} else {
		await Knex(testTableName).insert(rowsToInsert);
	}
	return {
		testTableName: testTableName,
		testTableColumnName: 'first_name',
		testTableSecondColumnName: 'email',
		testEntitiesSeedsCount: testEntitiesSeedsCount,
	};
}

export async function createTestPostgresTableWithSchema(
	connectionParams: any,
	testEntitiesSeedsCount = 42,
	testSearchedUserName = 'Vasia',
) {
	const Knex = getTestKnex(connectionParams);
	const testTableName = getRandomTestTableName();
	const testSchema = 'test_schema';
	await Knex.schema.dropTableIfExists(testTableName);

	const testTableColumnName = 'name';
	const testTableSecondColumnName = 'email';

	await Knex.schema.createSchemaIfNotExists(testSchema);
	await Knex.schema.withSchema(testSchema).dropTableIfExists(testSchema);
	await Knex.schema.withSchema(testSchema).createTable(testTableName, (table) => {
		table.increments();
		table.string(testTableColumnName);
		table.string(testTableSecondColumnName);
		table.timestamps();
	});

	const rowsToInsert: Array<Record<string, unknown>> = [];
	for (let i = 0; i < testEntitiesSeedsCount; i++) {
		if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
			rowsToInsert.push({
				[testTableColumnName]: testSearchedUserName,
				[testTableSecondColumnName]: faker.internet.email(),
				created_at: new Date(),
				updated_at: new Date(),
			});
		} else {
			rowsToInsert.push({
				[testTableColumnName]: faker.person.firstName(),
				[testTableSecondColumnName]: faker.internet.email(),
				created_at: new Date(),
				updated_at: new Date(),
			});
		}
	}
	await Knex(testTableName).withSchema(testSchema).insert(rowsToInsert);
	return {
		testTableName: testTableName,
		testTableColumnName: testTableColumnName,
		testTableSecondColumnName: testTableSecondColumnName,
		testEntitiesSeedsCount: testEntitiesSeedsCount,
	};
}

async function createTestDynamoDBTable(
	connectionParams: any,
	testEntitiesSeedsCount = 42,
	testSearchedUserName = 'Vasia',
) {
	const dynamoDb = new DynamoDB({
		endpoint: connectionParams.host,
		credentials: {
			accessKeyId: connectionParams.username,
			secretAccessKey: connectionParams.password,
		},
		region: 'localhost',
	});

	const testTableName = getRandomTestTableName();
	const testTableColumnName = 'name';
	const testTableSecondColumnName = 'email';

	const params = {
		TableName: testTableName,
		KeySchema: [
			{ AttributeName: 'id', KeyType: 'HASH' }, // Primary key
		],
		AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'N' }],
		ProvisionedThroughput: {
			ReadCapacityUnits: 5,
			WriteCapacityUnits: 5,
		},
	} as any;

	try {
		await dynamoDb.createTable(params);
	} catch (error) {
		console.error(`Error creating dynamodb table: ${error.message}`);
	}
	const insertedSearchedIds: Array<{ number: number; id: string }> = [];
	const documentClient = DynamoDBDocumentClient.from(dynamoDb);
	const writeRequests: Array<{ PutRequest: { Item: any } }> = [];
	for (let i = 0; i < testEntitiesSeedsCount; i++) {
		const isSearchedUser = i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5;
		const item = {
			id: { N: i },
			name: { S: isSearchedUser ? testSearchedUserName : faker.person.firstName() },
			email: { S: faker.internet.email() },
			age: {
				N: !isSearchedUser
					? faker.number.int({ min: 16, max: 80 })
					: i === 0
						? 14
						: i === testEntitiesSeedsCount - 21
							? 90
							: 95,
			},
			created_at: { S: new Date().toISOString() },
			updated_at: { S: new Date().toISOString() },
			list_column: { L: [{ S: 'value1' }, { S: 'value2' }] },
			set_column: { SS: ['value1', 'value2'] },
			map_column: { M: { key1: { S: 'value1' }, key2: { S: 'value2' } } },
			binary_column: { B: Buffer.from('hello') },
			binary_set_column: { BS: [Buffer.from('value1'), Buffer.from('value2')] },
		};

		if (isSearchedUser) {
			insertedSearchedIds.push({
				number: i,
				id: String(item.id.N),
			});
		}

		writeRequests.push({ PutRequest: { Item: item } });
	}
	try {
		const batchSize = 25;
		for (let start = 0; start < writeRequests.length; start += batchSize) {
			let unprocessed: any = {
				[testTableName]: writeRequests.slice(start, start + batchSize),
			};
			while (unprocessed && Object.keys(unprocessed).length > 0) {
				const result = await documentClient.send(new BatchWriteItemCommand({ RequestItems: unprocessed }));
				unprocessed =
					result.UnprocessedItems && Object.keys(result.UnprocessedItems).length > 0 ? result.UnprocessedItems : null;
			}
		}
	} catch (error) {
		console.error(`Error inserting item into dynamodb table: ${error.message}`);
		throw error;
	}

	return {
		testTableName: testTableName,
		testTableColumnName: testTableColumnName,
		testTableSecondColumnName: testTableSecondColumnName,
		testEntitiesSeedsCount: testEntitiesSeedsCount,
		insertedSearchedIds,
	};
}

async function createTestCassandraTable(
	connectionParams: any,
	testEntitiesSeedsCount = 42,
	testSearchedUserName = 'Vasia',
): Promise<CreatedTableInfo> {
	const testTableName = getRandomTestTableName().toLowerCase();
	const testTableColumnName = 'name';
	const testTableSecondColumnName = 'email';
	const client = new cassandra.Client({
		contactPoints: [connectionParams.host],
		localDataCenter: connectionParams.dataCenter,
		authProvider: new cassandra.auth.PlainTextAuthProvider(connectionParams.username, connectionParams.password),
		pooling: {
			coreConnectionsPerHost: {
				[cassandra.types.distance.local]: 1,
				[cassandra.types.distance.remote]: 1,
			},
			maxRequestsPerConnection: 32,
		},
		socketOptions: {
			readTimeout: 30000,
			connectTimeout: 30000,
		},
	});

	try {
		await client.connect();

		try {
			await client.execute(
				`CREATE KEYSPACE IF NOT EXISTS ${connectionParams.database} WITH REPLICATION = {'class': 'SimpleStrategy', 'replication_factor': 1}`,
			);
			await client.execute(`USE ${connectionParams.database}`);
			await client.execute(
				`CREATE TABLE IF NOT EXISTS ${testTableName} (id UUID, ${testTableColumnName} TEXT, ${testTableSecondColumnName} TEXT, age INT, created_at TIMESTAMP, updated_at TIMESTAMP, PRIMARY KEY (id, age))`,
			);
		} catch (error) {
			console.error(`Error creating Cassandra table: ${error.message}`);
			throw error;
		}
		const insertedSearchedIds: Array<{ number: number; id: string }> = [];
		const query = `INSERT INTO ${testTableName} (id, ${testTableColumnName}, ${testTableSecondColumnName}, age, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`;
		const insertParams: Array<Array<unknown>> = [];
		for (let i = 0; i < testEntitiesSeedsCount; i++) {
			const isSearchedUser = i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5;
			const generatedId = uuidv4();
			const age = isSearchedUser
				? i === 0
					? 14
					: i === testEntitiesSeedsCount - 21
						? 90
						: 95
				: faker.number.int({ min: 16, max: 80 });
			insertParams.push([
				generatedId,
				isSearchedUser ? testSearchedUserName : faker.person.firstName(),
				faker.internet.email(),
				age,
				new Date(),
				new Date(),
			]);
			if (isSearchedUser) {
				insertedSearchedIds.push({
					number: i,
					id: generatedId,
				});
			}
		}
		try {
			const concurrencyLimit = 16;
			for (let start = 0; start < insertParams.length; start += concurrencyLimit) {
				const chunk = insertParams.slice(start, start + concurrencyLimit);
				await Promise.all(chunk.map((params) => client.execute(query, params, { prepare: true })));
			}
		} catch (error) {
			console.error(`Error inserting into Cassandra table: ${error.message}`);
			throw error;
		}
		return {
			testTableName: testTableName,
			testTableColumnName: testTableColumnName,
			testTableSecondColumnName: testTableSecondColumnName,
			testEntitiesSeedsCount: testEntitiesSeedsCount,
			insertedSearchedIds,
		};
	} finally {
		await client.shutdown().catch((err) => console.error('Error shutting down Cassandra client:', err));
	}
}

async function createTestRedisTable(
	connectionParams: any,
	testEntitiesSeedsCount = 42,
	testSearchedUserName = 'Vasia',
): Promise<CreatedTableInfo> {
	const testTableName = getRandomTestTableName().toLowerCase();
	const testTableColumnName = 'name';
	const testTableSecondColumnName = 'email';

	const redisClient = createClient({
		socket: {
			host: connectionParams.host,
			port: connectionParams.port,
			ca: connectionParams.cert || undefined,
			cert: connectionParams.cert || undefined,
			rejectUnauthorized: connectionParams.ssl !== false,
		},
		password: connectionParams.password || undefined,
	});

	await redisClient.connect();

	const existingKeys = await redisClient.keys(`${testTableName}:*`);
	if (existingKeys.length > 0) {
		await redisClient.del(existingKeys);
	}

	const insertedSearchedIds: Array<{ number: number; id: string }> = [];
	const pipeline = redisClient.multi();

	for (let i = 0; i < testEntitiesSeedsCount; i++) {
		const isSearchedUser = i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5;
		const key = `user_${i}`;
		const rowKey = `${testTableName}:${key}`;

		const data = {
			[testTableColumnName]: isSearchedUser ? testSearchedUserName : faker.person.firstName(),
			[testTableSecondColumnName]: faker.internet.email(),
			age: isSearchedUser
				? i === 0
					? 14
					: i === testEntitiesSeedsCount - 21
						? 90
						: 95
				: faker.number.int({ min: 16, max: 80 }),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		pipeline.set(rowKey, JSON.stringify(data));

		if (isSearchedUser) {
			insertedSearchedIds.push({
				number: i,
				id: key,
			});
		}
	}
	await pipeline.exec();

	await redisClient.quit();

	return {
		testTableName: testTableName,
		testTableColumnName: testTableColumnName,
		testTableSecondColumnName: testTableSecondColumnName,
		testEntitiesSeedsCount: testEntitiesSeedsCount,
		insertedSearchedIds,
	};
}

async function createTestClickHouseTable(
	connectionParams: any,
	testEntitiesSeedsCount = 42,
	testSearchedUserName = 'Vasia',
): Promise<CreatedTableInfo> {
	const testTableName = getRandomTestTableName().toLowerCase().replace(/-/g, '_');
	const testTableColumnName = 'name';
	const testTableSecondColumnName = 'email';

	const client = createClickHouseClient({
		url: `http://${connectionParams.host}:${connectionParams.port}`,
		username: connectionParams.username || 'default',
		password: connectionParams.password || '',
		database: connectionParams.database || 'default',
	});

	try {
		await client.command({
			query: `
        CREATE TABLE IF NOT EXISTS ${testTableName} (
          id UInt32,
          ${testTableColumnName} String,
          ${testTableSecondColumnName} String,
          age UInt32,
          created_at DateTime,
          updated_at DateTime
        ) ENGINE = MergeTree()
        ORDER BY id
      `,
		});

		const insertedSearchedIds: Array<{ number: number; id: string }> = [];

		const rows: Array<{
			id: number;
			name: string;
			email: string;
			age: number;
			created_at: string;
			updated_at: string;
		}> = [];

		for (let i = 0; i < testEntitiesSeedsCount; i++) {
			const isSearchedUser = i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5;
			const age = isSearchedUser
				? i === 0
					? 14
					: i === testEntitiesSeedsCount - 21
						? 21
						: 37
				: faker.number.int({ min: 16, max: 80 });

			const row = {
				id: i + 1,
				name: isSearchedUser ? testSearchedUserName : faker.person.firstName(),
				email: faker.internet.email(),
				age: age,
				created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
				updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
			};

			rows.push(row);

			if (isSearchedUser) {
				insertedSearchedIds.push({
					number: i,
					id: String(i + 1),
				});
			}
		}

		await client.insert({
			table: testTableName,
			values: rows,
			format: 'JSONEachRow',
		});

		return {
			testTableName: testTableName,
			testTableColumnName: testTableColumnName,
			testTableSecondColumnName: testTableSecondColumnName,
			testEntitiesSeedsCount: testEntitiesSeedsCount,
			insertedSearchedIds,
		};
	} finally {
		await client.close();
	}
}
