import { InTransactionEnum } from '../../../enums/index.js';

export interface IGetConversions {
  execute(inputData: void, inTransaction: InTransactionEnum): Promise<string>;
}
