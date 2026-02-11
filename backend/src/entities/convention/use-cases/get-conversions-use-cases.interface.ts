import { InTransactionEnum } from '../../../enums/index.js';

export interface IGetConversions {
	execute(inputData: undefined, inTransaction: InTransactionEnum): Promise<string>;
}
