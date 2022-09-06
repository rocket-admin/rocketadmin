import { getTestKnex } from './get-test-knex';

export async function dropTestTables(tableNames: Array<string>, connectionParams): Promise<void> {
  const foundKnex = getTestKnex(connectionParams);
  await Promise.all(
    tableNames.map(async (tableName) => {
      await foundKnex.schema.dropTableIfExists(tableName);
    }),
  );
}
