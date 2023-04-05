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
      console.log('🚀 ~ file: get-tables-helper.ts:19 ~ consttablesMySQL:Array<string>= ~ tablesMySQL:', tablesMySQL)

      query = 'SELECT table_name FROM information_schema.views WHERE table_schema = ?';
      const viewsMySQL: Array<string> = (await knex.raw(query, bindings))[0].map((row) => {
        if (row.hasOwnProperty('TABLE_NAME')) return row.TABLE_NAME;
        if (row.hasOwnProperty('table_name')) return row.table_name;
      });
      console.log('🚀 ~ file: get-tables-helper.ts:26 ~ constviewsMySQL:Array<string>= ~ viewsMySQL:', viewsMySQL)
      
      return [...tablesMySQL, ...viewsMySQL];
    case 'Client_Oracle':
    case 'Client_Oracledb':
      query = `SELECT owner, table_name FROM all_tables WHERE owner = '${schema.toUpperCase()}'`;
      return knex.raw(query).then(function (results) {
        return results.map((row) => row['TABLE_NAME']);
      });
    case 'Client_PG':
      query = `SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_catalog = ?`;
      bindingSchema = schema ? schema : 'public';
      bindings = [bindingSchema, knex.client.database()];
      const tablesPg: Array<string> = (await knex.raw(query, bindings)).rows.map((row) => row.table_name);
      query = `SELECT table_name FROM information_schema.views WHERE table_schema = ? AND table_catalog = ?`;
      bindingSchema = schema ? schema : 'public';
      bindings = [bindingSchema, knex.client.database()];
      const viewsPg: Array<string> = (await knex.raw(query, bindings)).rows.map((row) => row.table_name);

      return [...tablesPg, ...viewsPg];
    case 'Client_SQLite3':
      query = "SELECT name AS table_name FROM sqlite_master WHERE type='table'";
      break;
  }

  return knex.raw(query, bindings).then(function (results) {
    return results.rows.map((row) => row.table_name);
  });
}
