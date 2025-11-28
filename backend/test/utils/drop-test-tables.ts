import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { getTestKnex } from './get-test-knex.js';

export async function dropTestTables(tableNames: Array<string>, connectionParams): Promise<void> {
  const connectionParamsCopy = {
    ...connectionParams,
  };
  if (connectionParams.type === 'mysql') {
    connectionParamsCopy.type = 'mysql2';
  }
  const foundKnex = getTestKnex(connectionParamsCopy);
  await Promise.all(
    tableNames.map(async (tableName) => {
      if (connectionParamsCopy.schema) {
        await foundKnex.schema.withSchema(connectionParamsCopy.schema).dropTableIfExists(tableName);
      }
      await foundKnex.schema.dropTableIfExists(tableName);
    }),
  );
}
