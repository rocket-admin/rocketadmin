/* eslint-disable @typescript-eslint/no-unused-vars */
import { fa, faker, th } from '@faker-js/faker';
import { getRandomConstraintName, getRandomTestTableName } from './get-random-test-table-name.js';
import { getTestKnex } from './get-test-knex.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';
import ibmdb, { Database } from 'ibm_db';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { DynamoDB, PutItemCommand, PutItemCommandInput } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Client } from '@elastic/elasticsearch';
import * as cassandra from 'cassandra-driver';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from 'redis';

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
  await Knex.schema.createTable(testTableName, function (table) {
    table.increments();
    table.string(testTableColumnName);
    table.string(testTableSecondColumnName);
    table.timestamps();
  });

  if (withJsonField) {
    await Knex.schema.table(testTableName, function (table) {
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
    await Knex.schema.table(testTableName, function (table) {
      table.string('telephone');
      table.string('uuid');
      table.string('countryCode');
      table.string('url');
      table.string('rgbColor');
      table.string('hexColor');
      table.string('hslColor');
    });
  }

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
      await Knex(testTableName).insert({
        [testTableColumnName]: testSearchedUserName,
        [testTableSecondColumnName]: faker.internet.email(),
        created_at: new Date(),
        updated_at: new Date(),
        ...widgetsDataObject,
      });
    } else {
      await Knex(testTableName).insert({
        [testTableColumnName]: faker.person.firstName(),
        [testTableSecondColumnName]: faker.internet.email(),
        created_at: new Date(),
        updated_at: new Date(),
        ...widgetsDataObject,
      });
    }
  }
  return {
    testTableName: testTableName,
    testTableColumnName: testTableColumnName,
    testTableSecondColumnName: testTableSecondColumnName,
    testEntitiesSeedsCount: testEntitiesSeedsCount,
  };
}

export async function createTestElasticsearchTable(
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
  const response = await client.indices.create({
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
  const insertedSearchedIds: Array<{
    number: number;
    _id: string;
  }> = [];
  for (let i = 0; i < testEntitiesSeedsCount; i++) {
    if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
      const insertResult = await client.index({
        index: testTableName,
        body: {
          [testTableColumnName]: testSearchedUserName,
          [testTableSecondColumnName]: faker.internet.email(),
          created_at: new Date(),
          updated_at: new Date(),
          age: i === 0 ? 14 : i === testEntitiesSeedsCount - 21 ? 90 : 95,
        },
      });
      insertedSearchedIds.push({
        number: i,
        _id: insertResult._id,
      });
    } else {
      const insertResult = await client.index({
        index: testTableName,
        body: {
          [testTableColumnName]: faker.person.firstName(),
          [testTableSecondColumnName]: faker.internet.email(),
          created_at: new Date(),
          updated_at: new Date(),
          age: faker.number.int({ min: 16, max: 80 }),
        },
      });
      insertedSearchedIds.push({
        number: i,
        _id: insertResult._id,
      });
    }
  }
  await client.indices.refresh({ index: testTableName });
  return {
    testTableName: testTableName,
    testTableColumnName: testTableColumnName,
    testTableSecondColumnName: testTableSecondColumnName,
    testEntitiesSeedsCount: testEntitiesSeedsCount,
    insertedSearchedIds,
  };
}

export async function createTestTableIbmDb2(
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

  for (let i = 0; i < testEntitiesSeedsCount; i++) {
    if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
      await ibmDatabase.query(
        `INSERT INTO ${
          connectionParams.schema
        }.${testTableName} (${testTableColumnName}, ${testTableSecondColumnName}, created_at, updated_at) VALUES ('${testSearchedUserName}', '${faker.internet.email()}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      );
    } else {
      await ibmDatabase.query(
        `INSERT INTO ${
          connectionParams.schema
        }.${testTableName} (${testTableColumnName}, ${testTableSecondColumnName}, created_at, updated_at) VALUES ('${faker.person
          .firstName()
          .replace(/["']/g, '')}', '${faker.internet
          .email()
          .replace(/["']/g, '')}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
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
  const insertedSearchedIds = [];
  for (let i = 0; i < testEntitiesSeedsCount; i++) {
    if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
      const insertionResult = await collection.insertOne({
        [testTableColumnName]: testSearchedUserName,
        [testTableSecondColumnName]: faker.internet.email(),
        created_at: new Date(),
        updated_at: new Date(),
        age: i === 0 ? 14 : i === testEntitiesSeedsCount - 21 ? 90 : 95,
      });
      insertedSearchedIds.push({
        number: i,
        _id: insertionResult.insertedId.toHexString(),
      });
    } else {
      const insertionResult = await collection.insertOne({
        [testTableColumnName]: faker.person.firstName(),
        [testTableSecondColumnName]: faker.internet.email(),
        created_at: new Date(),
        updated_at: new Date(),
        age: faker.number.int({ min: 16, max: 80 }),
      });
      insertedSearchedIds.push({
        number: i,
        _id: insertionResult.insertedId.toHexString(),
      });
    }
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
  schemaName = 'test_chema',
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
  await Knex.schema.createTable(`test_schema.${testTableName}`, function (table) {
    table.increments();
    table.string(testTableColumnName);
    table.string(testTableSecondColumnName);
    table.timestamps();
  });

  for (let i = 0; i < testEntitiesSeedsCount; i++) {
    if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
      await Knex(testTableName)
        .withSchema('test_schema')
        .insert({
          [testTableColumnName]: testSearchedUserName,
          [testTableSecondColumnName]: faker.internet.email(),
          created_at: new Date(),
          updated_at: new Date(),
        });
    } else {
      await Knex(testTableName)
        .withSchema('test_schema')
        .insert({
          [testTableColumnName]: faker.person.firstName(),
          [testTableSecondColumnName]: faker.internet.email(),
          created_at: new Date(),
          updated_at: new Date(),
        });
    }
  }
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
  await Knex.schema.createTable(testTableName, function (table) {
    table.integer(pColumnName);
    table.string(testTableColumnName);
    table.string(testTableSecondColumnName);
    table.timestamp('created_at');
    table.date('updated_at');
  });
  await Knex.schema.alterTable(testTableName, function (t) {
    t.primary([pColumnName], primaryKeyConstraintName);
  });
  let counter = 0;

  if (shema) {
    for (let i = 0; i < testEntitiesSeedsCount; i++) {
      if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
        await Knex(testTableName)
          .withSchema(username.toUpperCase())
          .insert({
            [pColumnName]: ++counter,
            [testTableColumnName]: testSearchedUserName,
            [testTableSecondColumnName]: faker.internet.email(),
            created_at: new Date(),
            updated_at: new Date(),
          });
      } else {
        await Knex(testTableName)
          .withSchema(username.toUpperCase())
          .insert({
            [pColumnName]: ++counter,
            [testTableColumnName]: faker.person.firstName(),
            [testTableSecondColumnName]: faker.internet.email(),
            created_at: new Date(),
            updated_at: new Date(),
          });
      }
    }
  } else {
    for (let i = 0; i < testEntitiesSeedsCount; i++) {
      if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
        await Knex(testTableName).insert({
          [pColumnName]: ++counter,
          [testTableColumnName]: testSearchedUserName,
          [testTableSecondColumnName]: faker.internet.email(),
          created_at: new Date('2010-11-03'),
          updated_at: new Date(),
        });
      } else {
        await Knex(testTableName).insert({
          [pColumnName]: ++counter,
          [testTableColumnName]: faker.person.firstName(),
          [testTableSecondColumnName]: faker.internet.email(),
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
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
  const primaryKeyConstraintName = getRandomConstraintName();
  const pColumnName = 'id';
  const testTableColumnName = 'name';
  const testTableSecondColumnName = 'email';
  const { shema, username } = connectionParams;
  const testTableName = getRandomTestTableName().toUpperCase();
  const Knex = getTestKnex(connectionParams);
  await Knex.schema.dropTableIfExists(testTableName);

  await Knex.schema.createTable(testTableName, function (table) {
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
  } catch (error) {
    console.log('Warning: Could not add CHECK constraint for gender field');
  }

  let counter = 0;

  if (shema) {
    for (let i = 0; i < testEntitiesSeedsCount; i++) {
      if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
        await Knex(testTableName)
          .withSchema(username.toUpperCase())
          .insert({
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
        await Knex(testTableName)
          .withSchema(username.toUpperCase())
          .insert({
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
  } else {
    for (let i = 0; i < testEntitiesSeedsCount; i++) {
      if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
        await Knex(testTableName).insert({
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
        await Knex(testTableName).insert({
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
  await Knex.schema.withSchema(testSchema).createTable(testTableName, function (table) {
    table.increments();
    table.string(testTableColumnName);
    table.string(testTableSecondColumnName);
    table.timestamps();
  });

  for (let i = 0; i < testEntitiesSeedsCount; i++) {
    if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
      await Knex(testTableName)
        .withSchema(testSchema)
        .insert({
          [testTableColumnName]: testSearchedUserName,
          [testTableSecondColumnName]: faker.internet.email(),
          created_at: new Date(),
          updated_at: new Date(),
        });
    } else {
      await Knex(testTableName)
        .withSchema(testSchema)
        .insert({
          [testTableColumnName]: faker.person.firstName(),
          [testTableSecondColumnName]: faker.internet.email(),
          created_at: new Date(),
          updated_at: new Date(),
        });
    }
  }
  return {
    testTableName: testTableName,
    testTableColumnName: testTableColumnName,
    testTableSecondColumnName: testTableSecondColumnName,
    testEntitiesSeedsCount: testEntitiesSeedsCount,
  };
}

export async function createTestDynamoDBTable(
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
  try {
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

      const params: PutItemCommandInput = {
        TableName: testTableName,
        Item: item as any,
      };
      await documentClient.send(new PutItemCommand(params));
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

export async function createTestCassandraTable(
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
    const insertedSearchedIds = [];
    for (let i = 0; i < testEntitiesSeedsCount; i++) {
      const isSearchedUser = i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5;

      const generatedId = uuidv4();
      const query = `INSERT INTO ${testTableName} (id, ${testTableColumnName}, ${testTableSecondColumnName}, age, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`;
      const age = isSearchedUser
        ? i === 0
          ? 14
          : i === testEntitiesSeedsCount - 21
            ? 90
            : 95
        : faker.number.int({ min: 16, max: 80 });
      const params = [
        generatedId,
        isSearchedUser ? testSearchedUserName : faker.person.firstName(),
        faker.internet.email(),
        age,
        new Date(),
        new Date(),
      ];
      try {
        await client.execute(query, params, { prepare: true });
        if (isSearchedUser) {
          insertedSearchedIds.push({
            number: i,
            id: generatedId,
          });
        }
      } catch (error) {
        console.error(`Error inserting into Cassandra table: ${error.message}`);
        throw error;
      }
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
      rejectUnauthorized: connectionParams.ssl === false ? false : true,
    },
    password: connectionParams.password || undefined,
  });

  await redisClient.connect();

  const existingKeys = await redisClient.keys(`${testTableName}:*`);
  if (existingKeys.length > 0) {
    await redisClient.del(existingKeys);
  }

  const insertedSearchedIds: Array<{ number: number; id: string }> = [];

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

    await redisClient.set(rowKey, JSON.stringify(data));

    if (isSearchedUser) {
      insertedSearchedIds.push({
        number: i,
        id: key,
      });
    }
  }

  await redisClient.quit();

  return {
    testTableName: testTableName,
    testTableColumnName: testTableColumnName,
    testTableSecondColumnName: testTableSecondColumnName,
    testEntitiesSeedsCount: testEntitiesSeedsCount,
    insertedSearchedIds,
  };
}
