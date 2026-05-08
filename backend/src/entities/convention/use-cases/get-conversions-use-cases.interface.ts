import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';

export interface IGetConversions {
	execute(inputData: undefined, inTransaction: InTransactionEnum): Promise<string>;
}
