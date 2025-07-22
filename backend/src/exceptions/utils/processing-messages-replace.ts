export const PROCESSING_MESSAGES_REPLACE = {
  getaddrinfo_ENOTFOUND:
    'Client was not able to connect to this address. Please check the hostname and port, ' +
    'and make sure our servers are able to access your database. We use IP address 18.221.81.73 for all outbound requests.',
  ORA_02292: 'You tried to change a record in a table that is referenced by a record in a child table ',
  ALLOW_CONNECTIONS:
    'Client was not able to connect to address. Please allow external connections to your database ' +
    'or use agent connection.',
  UPDATE_COMMAND_DENIED: `No permission to update record. Please ask your system administator to grant you access in the database`,
  NO_PGHBA_ENTRY: `Please add this line to pg_hba.conf: <database_name> all 18.221.81.73/32 md5`,
  VIOLATES_FOREIGN_CONSTRAINT_PG: (originalMessage: string): string => {
    try {
      const words = originalMessage.split(' ');
      const updateWordIndex = words.findIndex((word) => {
        return word === 'update';
      });
      const firstTableName = words.at(updateWordIndex + 5);
      const violatesWordIndex = words.findIndex((word) => {
        return word === 'violates';
      });
      const secondTableName = words.at(violatesWordIndex + 7);
      const message = `
      You tried to change a record in a table ${firstTableName}, but this table is referenced by the ${secondTableName} table.
      Before the operation, you need to update/delete the associated record in table ${secondTableName} or set up in that table an option with operation for the associated entry ("Cascade option").
      `;
      return message;
    } catch (_e) {
      return originalMessage;
    }
  },
  VIOLATES_FOREIGN_CONSTRAINT_MYSQL: (originalMessage: string) => {
    const words = originalMessage.split(' ');
    const regex = /(?<=\()[^)]+(?=\))/g;
    const referencesWordIndex = words.findIndex((word) => {
      return word === 'references';
    });
    const tableName = words.at(referencesWordIndex + 1);
    const relatedColumnName = words.at(referencesWordIndex + 2).match(regex);
    const message = `
    You tried to change a record in a table ${tableName}, but another table references on ${relatedColumnName} field in this table.
    Before the operation, you need to update/delete the associated record in that table or set up in that table an option with operation for the associated entry ("Cascade option").
    `;
    return message;
  },
  VIOLATES_FOREIGN_CONSTRAINT_MSSQL: (originalMessage: string) => {
    const words = originalMessage.split(' ');
    const fromWordIndex = words.findIndex((word) => {
      return word === 'from';
    });
    const firstTableName = words.at(fromWordIndex + 1);
    const tableWordIndex = words.findIndex((word) => {
      return word === 'table';
    });
    const secondTableName = words.at(tableWordIndex + 1);
    const message = `
    You tried to change a record in a table ${firstTableName}, but this table is referenced by the ${secondTableName} table.
    Before the operation, you need to update/delete the associated record in table ${secondTableName} or set up in that table an option with operation for the associated entry ("Cascade option").
    `;
    return message;
  },
  SELECT_COMMAND_DENIED_MYSQL: (originalMessage: string): string => {
    const words = originalMessage.split(' ');
    const userWordIndex = words.findIndex((word) => {
      return word === 'user';
    });
    const dbUser = words.at(userWordIndex + 1);
    const message = `
    User ${dbUser} don't have permission to perform select command for this table.
    Please grant select permissions to user in your database.
    `;
    return message;
  },

  Malformed_UTF_data: 'Failed to decrypt connection. Please check that master password is correct.',
};
