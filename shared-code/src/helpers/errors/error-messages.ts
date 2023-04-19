export const ERROR_MESSAGES = {
  TABLE_SCHEMA_NOT_FOUND: (tableName: string): string =>
    `Table schema for table ${tableName} not found or this table does not exists`,
  CANT_CONNECT_AUTOADMIN_WS: `Connection to autoadmin websocket server failed.`,
  PROPERTY_TYPE_REQUIRED: `Property "type" is required`,
  CONNECTION_PARAMS_SHOULD_BE_DEFINED: `Connection parameters should be defined`,
  CONNECTION_TYPE_INVALID: `Connection type is invalid`,
  AGENT_SHOULD_BE_DEFINED: `Agent and agent token should be defined`,
};
