/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { getRandomConstraintName, getRandomTestTableName } from './get-random-test-table-name.js';
import { getTestKnex } from './get-test-knex.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';
import ibmdb, { Database } from 'ibm_db';
import { MongoClient, Db, ObjectId } from 'mongodb';

export async function createTestTable(
  connectionParams: any,
  testEntitiesSeedsCount = 42,
  testSearchedUserName = 'Vasia',
): Promise<CreatedTableInfo> {
  if (connectionParams.type === ConnectionTypesEnum.ibmdb2) {
    return createTestTableIbmDb2(connectionParams, testEntitiesSeedsCount, testSearchedUserName);
  }

  if (connectionParams.type === ConnectionTypesEnum.mongodb) {
    return createTestMongoTable(connectionParams, testEntitiesSeedsCount, testSearchedUserName);
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

  for (let i = 0; i < testEntitiesSeedsCount; i++) {
    if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
      await Knex(testTableName).insert({
        [testTableColumnName]: testSearchedUserName,
        [testTableSecondColumnName]: faker.internet.email(),
        created_at: new Date(),
        updated_at: new Date(),
      });
    } else {
      await Knex(testTableName).insert({
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
  insertedSearchedIds?: Array<{ number: number; _id: string }>;
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
    table.timestamps();
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
          created_at: new Date(),
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
