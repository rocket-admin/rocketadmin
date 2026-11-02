import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import {
	AiDataRequestDs,
	DeleteAiRowsDs,
	ExecuteAiAggregationPipelineDs,
	ExecuteAiRawQueryDs,
	GetAiSampleRowsDs,
	GetAiTableStructureDs,
	GetCompanySubscriptionInfoDs,
	InsertAiRowsDs,
	ScanAndCreateSettingsDs,
	SetPublicPermissionsDs,
	SetSiteRuntimePolicyDs,
	UpdateAiRowsDs,
	ValidateConnectionEditDs,
	ValidateTableAiRequestDs,
	ValidateUserTokenDs,
} from '../data-structures/agents.ds.js';
import {
	AiConnectionContextRO,
	AiConnectionTablesRO,
	AiQueryResultRO,
	AiRowsDeletedRO,
	AiRowsInsertedRO,
	AiRowsUpdatedRO,
	AiSampleRowsRO,
	CompanySubscriptionInfoRO,
	PermissionAllowedRO,
	PublicPermissionsRO,
	SiteRuntimePolicyRO,
	ValidatedUserTokenRO,
} from '../data-structures/agents-responses.ds.js';

export interface IValidateUserToken {
	execute(inputData: ValidateUserTokenDs, inTransaction: InTransactionEnum): Promise<ValidatedUserTokenRO>;
}

export interface IValidateTableAiRequest {
	execute(inputData: ValidateTableAiRequestDs, inTransaction: InTransactionEnum): Promise<PermissionAllowedRO>;
}

export interface IValidateConnectionEdit {
	execute(inputData: ValidateConnectionEditDs, inTransaction: InTransactionEnum): Promise<PermissionAllowedRO>;
}

export interface ISetPublicPermissions {
	execute(inputData: SetPublicPermissionsDs, inTransaction: InTransactionEnum): Promise<PublicPermissionsRO>;
}

export interface ISetSiteRuntimePolicy {
	execute(inputData: SetSiteRuntimePolicyDs, inTransaction: InTransactionEnum): Promise<SiteRuntimePolicyRO>;
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

export interface IGetAiSampleRows {
	execute(inputData: GetAiSampleRowsDs, inTransaction: InTransactionEnum): Promise<AiSampleRowsRO>;
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

// Row writes for the SiteNova chat data agent (sitenova plan 85).
export interface IInsertAiRows {
	execute(inputData: InsertAiRowsDs, inTransaction: InTransactionEnum): Promise<AiRowsInsertedRO>;
}

export interface IUpdateAiRows {
	execute(inputData: UpdateAiRowsDs, inTransaction: InTransactionEnum): Promise<AiRowsUpdatedRO>;
}

export interface IDeleteAiRows {
	execute(inputData: DeleteAiRowsDs, inTransaction: InTransactionEnum): Promise<AiRowsDeletedRO>;
}
