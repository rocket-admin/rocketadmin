import { faker } from '@faker-js/faker';
import { getRandomConstraintName, getRandomTestTableName } from './get-random-test-table-name.js';
import { getTestKnex } from './get-test-knex.js';

export async function createTestTable(
  connectionParams,
  testEntitiesSeedsCount = 42,
  testSearchedUserName = 'Vasia',
): Promise<CreatedTableInfo> {
  const testTableName = getRandomTestTableName();
  const testTableColumnName = `${faker.random.words(1)}_${faker.random.words(1)}`;
  const testTableSecondColumnName = `${faker.random.words(1)}_${faker.random.words(1)}`;
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
        [testTableColumnName]: faker.name.firstName(),
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

export type CreatedTableInfo = {
  testTableName: string;
  testTableColumnName: string;
  testTableSecondColumnName: string;
  testEntitiesSeedsCount: number;
};

export async function createTestTableForMSSQLWithChema(
  connectionParams,
  testEntitiesSeedsCount = 42,
  testSearchedUserName = 'Vasia',
  schemaName = 'test_chema',
) {
  const testTableName = getRandomTestTableName();
  const testTableColumnName = `${faker.random.words(1)}_${faker.random.words(1)}`;
  const testTableSecondColumnName = `${faker.random.words(1)}_${faker.random.words(1)}`;
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
          [testTableColumnName]: faker.name.firstName(),
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
            [testTableColumnName]: faker.name.firstName(),
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
          [testTableColumnName]: faker.name.firstName(),
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
          [testTableColumnName]: faker.name.firstName(),
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
