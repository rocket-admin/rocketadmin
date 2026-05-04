import { InTransactionEnum } from '../enums/in-transaction.enum.js';

export interface IGetHello {
	execute(inputData: undefined, inTransaction: InTransactionEnum): Promise<string>;
}
