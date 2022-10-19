import { InTransactionEnum } from '../enums';

export interface IGetHello {
  execute(inputData: void, inTransaction: InTransactionEnum): Promise<string>;
}
