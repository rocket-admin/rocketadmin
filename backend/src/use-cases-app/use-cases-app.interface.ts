import { InTransactionEnum } from '../enums/index.js';

export interface IGetHello {
	execute(inputData: undefined, inTransaction: InTransactionEnum): Promise<string>;
}
