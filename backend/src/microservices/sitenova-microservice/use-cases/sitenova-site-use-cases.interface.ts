import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import {
	SitenovaEndUserAuthResultDs,
	SitenovaLoginEndUserDs,
	SitenovaRegisterEndUserDs,
} from '../data-structures/sitenova-site.ds.js';

export interface ISitenovaRegisterEndUser {
	execute(inputData: SitenovaRegisterEndUserDs, inTransaction: InTransactionEnum): Promise<SitenovaEndUserAuthResultDs>;
}

export interface ISitenovaLoginEndUser {
	execute(inputData: SitenovaLoginEndUserDs, inTransaction: InTransactionEnum): Promise<SitenovaEndUserAuthResultDs>;
}
