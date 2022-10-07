import { InTransactionEnum } from '../../../enums';

export interface IGetConversions {
  execute(inputData: void, inTransaction: InTransactionEnum): Promise<string>;
}
