import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import {
	SitenovaExecuteRawQueryDs,
	SitenovaGetConnectionDs,
	SitenovaRowEventDs,
	SitenovaValidatePublicReadDs,
} from '../data-structures/sitenova.ds.js';
import {
	SitenovaConnectionForSiteRuntimeRO,
	SitenovaPublicReadValidationRO,
	SitenovaRowEventRO,
} from '../data-structures/sitenova-internal-responses.ds.js';
import { SitenovaRawQueryResultRO } from '../data-structures/sitenova-responses.ds.js';

export interface ISitenovaExecuteRawQuery {
	execute(inputData: SitenovaExecuteRawQueryDs, inTransaction: InTransactionEnum): Promise<SitenovaRawQueryResultRO>;
}

export interface ISitenovaGetConnection {
	execute(
		inputData: SitenovaGetConnectionDs,
		inTransaction: InTransactionEnum,
	): Promise<SitenovaConnectionForSiteRuntimeRO>;
}

export interface ISitenovaValidatePublicRead {
	execute(
		inputData: SitenovaValidatePublicReadDs,
		inTransaction: InTransactionEnum,
	): Promise<SitenovaPublicReadValidationRO>;
}

export interface ISitenovaActivateRowEventActions {
	execute(inputData: SitenovaRowEventDs, inTransaction: InTransactionEnum): Promise<SitenovaRowEventRO>;
}
