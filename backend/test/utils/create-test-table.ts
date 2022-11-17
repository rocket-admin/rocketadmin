import { faker } from '@faker-js/faker';
import { getRandomTestTableName } from './get-random-test-table-name';
import { getTestKnex } from './get-test-knex';

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
  await Knex.schema.dropTableIfExists(testTableName);
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
  await Knex.raw(`IF NOT EXISTS ( SELECT  *
                FROM    sys.schemas
                WHERE   name = N'test_schema' )
    EXEC('CREATE SCHEMA [test_schema]');`);
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
