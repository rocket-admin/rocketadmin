export const PROCESSING_MESSAGES_REPLACE = {
  getaddrinfo_ENOTFOUND:
    'Client was not able to connect to given address. Please check the hostname and port, ' +
    'and make sure our servers are able to access your database. We use IP address 18.221.81.73 for all outbound requests.',
  ORA_02292: 'You tried to change a record in a table that is referenced by a record in a child table ',
  ALLOW_CONNECTIONS:
    'Client was not able to connect to address. Please allow external connections to your database ' +
    'or use agent connection.',
  NO_PGHBA_ENTRY: `Please add this line to pg_hba.conf: <database_name> all 18.221.81.73/32 md5`,
};
