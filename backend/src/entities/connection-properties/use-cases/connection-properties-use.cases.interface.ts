import { FoundConnectionPropertiesDs } from '../application/data-structures/found-connection-properties.ds';
import { CreateConnectionPropertiesDs } from '../application/data-structures/create-connection-properties.ds';

export interface IFindConnectionProperties {
  execute(connectionId: string): Promise<FoundConnectionPropertiesDs>;
}

export interface ICreateConnectionProperties {
  execute(inputData: CreateConnectionPropertiesDs): Promise<FoundConnectionPropertiesDs>;
}

export interface IUpdateConnectionProperties {
  execute(inputData: CreateConnectionPropertiesDs): Promise<FoundConnectionPropertiesDs>;
}

export interface IDeleteConnectionProperties {
  execute(connectionId: string): Promise<FoundConnectionPropertiesDs>;
}
