import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import {
	AiDataRequestDs,
	ExecuteAiAggregationPipelineDs,
	ExecuteAiRawQueryDs,
	GetAiTableStructureDs,
	GetCompanySubscriptionInfoDs,
	ScanAndCreateSettingsDs,
	ValidateConnectionEditDs,
	ValidateTableAiRequestDs,
} from '../data-structures/agents.ds.js';
import {
	AiConnectionContextRO,
	AiConnectionTablesRO,
	AiQueryResultRO,
	CompanySubscriptionInfoRO,
	PermissionAllowedRO,
	ValidatedUserTokenRO,
} from '../data-structures/agents-responses.ds.js';

export interface IValidateUserToken {
	execute(token: string, inTransaction: InTransactionEnum): Promise<ValidatedUserTokenRO>;
}

export interface IValidateTableAiRequest {
	execute(inputData: ValidateTableAiRequestDs, inTransaction: InTransactionEnum): Promise<PermissionAllowedRO>;
}

export interface IValidateConnectionEdit {
	execute(inputData: ValidateConnectionEditDs, inTransaction: InTransactionEnum): Promise<PermissionAllowedRO>;
}

export interface IGetAiConnectionContext {
	execute(inputData: AiDataRequestDs, inTransaction: InTransactionEnum): Promise<AiConnectionContextRO>;
}

export interface IGetAiTableStructure {
	execute(inputData: GetAiTableStructureDs, inTransaction: InTransactionEnum): Promise<Record<string, unknown>>;
}

export interface IGetAiConnectionTables {
	execute(inputData: AiDataRequestDs, inTransaction: InTransactionEnum): Promise<AiConnectionTablesRO>;
}

export interface IExecuteAiRawQuery {
	execute(inputData: ExecuteAiRawQueryDs, inTransaction: InTransactionEnum): Promise<AiQueryResultRO>;
}

export interface IExecuteAiAggregationPipeline {
	execute(inputData: ExecuteAiAggregationPipelineDs, inTransaction: InTransactionEnum): Promise<AiQueryResultRO>;
}

export interface IScanAndCreateSettings {
	execute(inputData: ScanAndCreateSettingsDs, inTransaction: InTransactionEnum): Promise<void>;
}

export interface IGetCompanySubscriptionInfo {
	execute(
		inputData: GetCompanySubscriptionInfoDs,
		inTransaction: InTransactionEnum,
	): Promise<CompanySubscriptionInfoRO>;
}
