export async function listTables(knex: any, schema = null): Promise<Array<string>> {
  let query: string;
  let bindings: string[];
  let bindingSchema: string;
  switch (knex.client.constructor.name) {
    case 'Client_MSSQL':
      bindingSchema = schema ? schema : 'public';
      (query = 'SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_catalog = ?'),
        (bindings = [bindingSchema, knex.client.database()]);
      break;
    case 'Client_MySQL':
    case 'Client_MySQL2':
      query = 'SELECT table_name FROM information_schema.tables WHERE table_schema = ?';
      bindings = [knex.client.database()];
      const tablesMySQL: Array<string> = (await knex.raw(query, bindings))[0].map((row) => {
        if (row.hasOwnProperty('TABLE_NAME')) return row.TABLE_NAME;
        if (row.hasOwnProperty('table_name')) return row.table_name;
      });

      query = 'SELECT table_name FROM information_schema.views WHERE table_schema = ?';
      const viewsMySQL: Array<string> = (await knex.raw(query, bindings))[0].map((row) => {
        if (row.hasOwnProperty('TABLE_NAME')) return row.TABLE_NAME;
        if (row.hasOwnProperty('table_name')) return row.table_name;
      });

      return [...tablesMySQL, ...viewsMySQL];
    case 'Client_Oracle':
    case 'Client_Oracledb':
      query = `SELECT owner, table_name FROM all_tables WHERE owner = ?`;
      bindings = [schema.toUpperCase()];
      const tablesOracle = (await knex.raw(query, bindings)).map((row) => row['TABLE_NAME']);
      query = `SELECT owner, view_name FROM all_views WHERE owner = ?`;
      const viewsOracle = (await knex.raw(query, bindings)).map((row) => row['VIEW_NAME']);
      return [...tablesOracle, ...viewsOracle];
    case 'Client_PG':
      query = `SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_catalog = current_database()`;
      bindingSchema = schema ? schema : 'public';
      bindings = [bindingSchema];
      const tablesPg: Array<string> = (await knex.raw(query, bindings)).rows.map((row) => row.table_name);
      console.log({ tablesPg });
      return tablesPg;
    case 'Client_SQLite3':
      query = "SELECT name AS table_name FROM sqlite_master WHERE type='table'";
      break;
  }

  return knex.raw(query, bindings).then(function (results) {
    return results.rows.map((row) => row.table_name);
  });
}
