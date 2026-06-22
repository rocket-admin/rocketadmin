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
