export const ERROR_MESSAGES = {
  DATA_IS_TO_LARGE: `Data is too large`,
  TABLE_NOT_FOUND: (tableName: string): string => `Table ${tableName} not found`,
  TABLE_SCHEMA_NOT_FOUND: (tableName: string): string =>
    `Table schema for table ${tableName} not found or this table does not exists`,
  CANT_CONNECT_AUTOADMIN_WS: `Connection to autoadmin websocket server failed.`,
  PROPERTY_TYPE_REQUIRED: `Property "type" is required`,
  CONNECTION_PARAMS_SHOULD_BE_DEFINED: `Connection parameters should be defined`,
  CONNECTION_TYPE_INVALID: `Connection type is invalid`,
  AGENT_SHOULD_BE_DEFINED: `Agent and agent token should be defined`,
  NO_DATA_RETURNED_FROM_AGENT: `No data returned from agent`,
  INVALID_OBJECT_ID_FORMAT: `Invalid object id format`,
  CLIENT_NOT_CONNECTED: `Client is not connected`,
};
