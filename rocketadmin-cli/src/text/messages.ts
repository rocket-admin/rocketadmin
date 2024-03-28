import { enumToString } from '../helpers/enum-to-string.js';
import { QueryOrderingEnum } from '../enums/query-ordering.enum.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';
import { Constants } from '../helpers/constants/constants.js';

export const Messages = {
  APPLICATION_ENCRYPTION_PASSWORD_INVALID: `Invalid encryption password`,
  CANT_LIST_AND_EXCLUDE: `You cannot select the same field names to view and exclude`,
  CANT_ORDER_AND_EXCLUDE: `You cannot select the same field names to order and exclude`,
  CONNECTION_TYPE_INVALID: `Unsupported database type. Now we supports ${enumToString(ConnectionTypesEnum)}`,
  CONNECTION_HOST_INVALID: `Invalid connection host`,
  CONNECTION_PORT_INVALID: `Invalid connection port`,
  CONNECTION_USERNAME_INVALID: `Invalid connection username`,
  CONNECTION_PASSWORD_INVALID: `Invalid connection password`,
  CONNECTION_DATABASE_INVALID: `Invalid connection database`,
  CONNECTION_SCHEMA_INVALID: `Invalid connection schema`,
  CANT_EXCLUDE_PRIMARY_KEY: (key: string) => `You cannot exclude primary key ${key}`,
  CONNECTION_TOKEN_MISSING: 'Connection token missing',
  CONNECTION_TYPE_UNSUPPORTED: 'Connection to this type of database has not been implemented yet',
  CORRUPTED_DATA: 'You data are corrupted. Please delete saved configuration file and re-enter the credentials',
  CORRUPTED_DATA_OR_PASSWORD: `You password is incorrect or data is corrupted. Please check your credentials`,
  CREDENTIALS_ACCEPTED: '-> Credentials accepted. Try to launch application',
  DATABASE_MISSING: 'Database is missing',
  FAIL_MESSAGE: (message: string) => `Method execution failed with message: "${message}".`,
  FAILED_ESTABLISH_SSH_CONNECTION: `Failed to establish ssh connection`,
  FAILED_ADD_ROW_IN_TABLE: `Failed to add row in table`,
  FAILED_DELETE_ROW_IN_TABLE: `Failed to delete row from table`,
  FAILED_GET_ROW_FROM_TABLE: `Failed to get row by primary key`,
  FAILED_GET_ROWS_FROM_TABLE: `Failed to get rows from table`,
  FAILED_GET_TABLE_FOREIGN_KEYS: `Failed to get table foreign keys`,
  FAILED_GET_TABLE_PRIMARY_COLUMNS: `Failed to get table primary columns`,
  FAILED_GET_TABLE_STRUCTURE: `Failed to get table structure`,
  FAILED_GET_TABLES: `Failed to get tables from database`,
  FAILED_UPDATE_ROW: `Failed to update row in table`,
  FAILED_TO_UPDATE_ROWS: `Failed to update rows in table`,
  FAILED_VALIDATE_TABLE_SETTINGS: `Failed validate table settings`,
  FAILED_TO_GET_IDENTITY_COLUMNS: `Failed to get identity columns`,
  FAILED_TO_CHECK_IS_VIEW: `Failed to check is view`,
  HOST_MISSING: 'Host is missing',
  LIST_PER_PAGE_INCORRECT: `You can't display less than one row per page`,
  MUST_BE_ARRAY: (fieldName: string) => `The field "${fieldName}" must be an array`,
  NO_SUCH_FIELDS_IN_TABLES: (fields: Array<string>, tableName: string) =>
    `There are no such fields: ${fields.join(', ')} - in the table "${tableName}"`,
  ORDERING_FIELD_INCORRECT: `Value of sorting order is incorrect. You can choose from values ${enumToString(
    QueryOrderingEnum,
  )}`,
  PORT_FORMAT_INCORRECT: 'Port value must be a number',
  PORT_MISSING: 'Port value is invalid',
  SSH_FORMAT_INCORRECT: 'Ssh value must be a boolean',
  SSL_FORMAT_INCORRECT: 'Ssl value must be a boolean',
  SSH_HOST_MISSING: 'Ssh host is missing',
  SSH_PORT_MISSING: 'Ssh port is missing',
  SSH_USERNAME_MISSING: 'Ssh username is missing',
  TYPE_MISSING: 'Type is missing',
  USERNAME_MISSING: 'Username is missing',
  UNKNOWN_OPERATION: (operation: string): string => `Received unsupported operation ${operation}.`,
  SOCKET_WAS_DISCONNECTED: 'Socket is closed. Reconnect will be attempted in 1 second.',
  SOCKET_ENCOUNTERED_ERROR: (message: string): string =>
    `Socket connection error -> ${message ? message : ``}, Closing socket`,
  INTRO_MESSAGES: {
    WELCOME_MESSAGE:
      'Welcome! First of all, we need to configure the connection to your database. \n' +
      'Please, enter you unique connection token ' +
      'what you received when you created an agent-connection on the autoadmin website: \n ->',
    CONNECTION_TYPE_MESSAGE: `Please choose the type of connection. 
    We support the following types: `,
    CONNECTION_HOST_MESSAGE: `Please enter database host: \n ->`,
    CONNECTION_PORT_MESSAGE: `Please enter database port: \n ->`,
    CONNECTION_USERNAME_MESSAGE: `Please enter database login username: \n ->`,
    CONNECTION_PASSWORD_MESSAGE: `Please enter database password: \n ->`,
    CONNECTION_DATABASE_MESSAGE: `Please enter database name: \n ->`,
    CONNECTION_SCHEMA_MESSAGE: `Please enter database schema name. If it not exists leave this field empty: \n ->`,
    CONNECTION_SID_MESSAGE: `You selected database type "Oracle Database", if it have instance identifier (SID) please enter it's name
    or leave this field empty, if it doesn't exist': \n ->`,
    CONNECTION_AZURE_ENCRYPTION_MESSAGE: `Azure encryption option.
     If your database located in Microsoft Azure cloud, and requires encryption choose "Yes" or "No" - if it doesn't: \n ->`,
    CONNECTION_SSL_OPTION_MESSAGE: `SSL option. Choose "Yes"  if your database support ssl connections and
    if you want to use ssl connection to your database 
    (before answering "YES", please put the ssl certificate in the application directory and name it "cert.pem"),
    "No" - in another cases. \n ->`,
    APPLICATION_PORT_MESSAGE: `Enter port number, when this application will launch. Default is 3000. (You can left this value empty): \n ->`,
    APPLICATION_CONFIG_SAVE_MESSAGE: `If you want to save application configuration to file in application folder choose "Yes" or "No" if you don't want to save \n ->`,
    APPLICATION_CONFIG_ENCRYPT_MESSAGE: `If you want to encrypt file with saved configuration
     (you will need to enter the password after restarting the application)
      choose "Yes" or "No" if you don't want to do it \n ->`,
    APPLICATION_SAVE_LOGS_OPTION: `If you want to save application logs to file chose "Yes", or "No" if you don't want to save`,
    APPLICATION_CONFIG_ENCRYPT_PASSWORD_MESSAGE: `Please enter your encryption passphrase. We will not store it.
    If you forget your password, you will have to delete configuration file in your application folder and enter the connection parameters again \n ->`,
    ASK_ENCRYPTION_PASSWORD_MESSAGE: `Please enter your encryption password \n ->`,
    APPLICATION_CLI_QUIT: 'Quit the application',
    APPLICATION_ATTEMPTS_QUIT: `You entered incorrect value ${Constants.CLI_ATTEMPTS_COUNT} times. Please check your parameters and try again. Quit the application`,
    YOU_CHOOSE: (option: string) => `You choose ${option}`,
    ORACLE_INSTANT_CLIENT: `Oracle database requires "Oracle instant client" to be installed on your computer.
    You can find it on official Oracle website:
    https://www.oracle.com/database/technologies/instant-client/downloads.html`,
  },
};
