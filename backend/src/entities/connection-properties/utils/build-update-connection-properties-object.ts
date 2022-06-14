import { CreateConnectionPropertiesDs } from '../application/data-structures/create-connection-properties.ds';

export function buildUpdateConnectionPropertiesObject(
  inputData: CreateConnectionPropertiesDs,
): IUpdateConnectionPropertiesObject {
  const { hidden_tables } = inputData;
  return {
    hidden_tables: hidden_tables,
  };
}

export interface IUpdateConnectionPropertiesObject {
  hidden_tables: Array<string>;
}
