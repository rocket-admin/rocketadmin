import { InTransactionEnum } from '../enums/index.js';

export interface IGetHello {
  execute(inputData: void, inTransaction: InTransactionEnum): Promise<string>;
}
