import { InTransactionEnum } from '../../../enums';
import { CreateConnectionPropertiesDs } from '../application/data-structures/create-connection-properties.ds';
import { FoundConnectionPropertiesDs } from '../application/data-structures/found-connection-properties.ds';

export interface IFindConnectionProperties {
  execute(connectionId: string, inTransaction: InTransactionEnum): Promise<FoundConnectionPropertiesDs>;
}

export interface ICreateConnectionProperties {
  execute(inputData: CreateConnectionPropertiesDs, inTransaction: InTransactionEnum): Promise<FoundConnectionPropertiesDs>;
}

export interface IUpdateConnectionProperties {
  execute(inputData: CreateConnectionPropertiesDs, inTransaction: InTransactionEnum): Promise<FoundConnectionPropertiesDs>;
}

export interface IDeleteConnectionProperties {
  execute(connectionId: string, inTransaction: InTransactionEnum): Promise<FoundConnectionPropertiesDs>;
}
