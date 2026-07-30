import { Response } from 'express';

export class ValidateTableAiRequestDs {
	userId: string;
	connectionId: string;
	tableName: string;
}

export class ValidateConnectionEditDs {
	userId: string;
	connectionId: string;
}

export class SetPublicPermissionsDs {
	userId: string;
	connectionId: string;
	tables: Array<{ tableName: string; readableColumns?: Array<string> }>;
	mode: 'merge' | 'replace';
}

export class AiDataRequestDs {
	connectionId: string;
	userId: string;
	masterPassword: string | null;
}

export class GetAiTableStructureDs extends AiDataRequestDs {
	tableName: string;
}

export class ExecuteAiRawQueryDs extends AiDataRequestDs {
	tableName: string;
	query: string;
}

export class GetAiSampleRowsDs extends AiDataRequestDs {
	tableName: string;
	limit: number | null;
}

export class ExecuteAiAggregationPipelineDs extends AiDataRequestDs {
	tableName: string;
	pipeline: string;
}

export class ScanAndCreateSettingsDs extends AiDataRequestDs {
	response: Response;
}

export class GetCompanySubscriptionInfoDs {
	userId: string;
}
