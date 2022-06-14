export function listTables(knex: any, schema = null): Array<string> {
  let query: string;
  let bindings: string[];

  switch (knex.client.constructor.name) {
    case 'Client_MSSQL':
      (query = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_catalog = ?"),
        (bindings = [knex.client.database()]);
      break;
    case 'Client_MySQL':
    case 'Client_MySQL2':
      query = 'SELECT table_name FROM information_schema.tables WHERE table_schema = ?';
      bindings = [knex.client.database()];

      return knex.raw(query, bindings).then(function (results) {
        return results[0].map((row) => {
          if (row.hasOwnProperty('TABLE_NAME')) return row.TABLE_NAME;
          if (row.hasOwnProperty('table_name')) return row.table_name;
        });
      });

    case 'Client_Oracle':
    case 'Client_Oracledb':
      query = `SELECT owner, table_name FROM all_tables WHERE owner = '${schema.toUpperCase()}'`;
      return knex.raw(query).then(function (results) {
        return results.map((row) => row['TABLE_NAME']);
      });
    case 'Client_PG':
      query = `SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_catalog = ?`;
      const bindingSchema = schema ? schema : 'public';
      bindings = [bindingSchema, knex.client.database()];
      return knex.raw(query, bindings).then(function (results) {
        return results.rows.map((row) => row.table_name);
      });
    case 'Client_SQLite3':
      query = "SELECT name AS table_name FROM sqlite_master WHERE type='table'";
      break;
  }

  return knex.raw(query, bindings).then(function (results) {
    return results.rows.map((row) => row.table_name);
  });
}
