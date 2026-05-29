import { Logger } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { AIProviderType } from '../../../ai-core/interfaces/ai-service.interface.js';
import { AICoreService } from '../../../ai-core/services/ai-core.service.js';
import { MessageBuilder } from '../../../ai-core/utils/message-builder.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { SchemaChangeTypeEnum } from '../table-schema-change-enums.js';
import { isDynamoDbDialect, isElasticsearchDialect, isMongoDialect } from '../utils/assert-dialect-supported.js';
import { runSchemaChangeAiLoop } from './run-schema-change-ai-loop.js';
import {
	createDynamoDbSchemaChangeTools,
	createElasticsearchSchemaChangeTools,
	createMongoSchemaChangeTools,
	createSchemaChangeTools,
	ProposeSchemaChangeArgs,
} from './schema-change-tools.js';

export interface SchemaChangeFixAiLoopOptions {
	aiCoreService: AICoreService;
	provider: AIProviderType;
	connection: ConnectionEntity;
	connectionType: ConnectionTypesEnum;
	changeType: SchemaChangeTypeEnum;
	targetTableName: string;
	originalUserPrompt: string;
	failingSql: string;
	failingRollbackSql: string | null;
	executionError: string;
	logger?: Logger;
}

export interface SchemaChangeFixResult {
	fixedProposal: ProposeSchemaChangeArgs;
}

export async function runSchemaChangeFixAiLoop(
	opts: SchemaChangeFixAiLoopOptions,
): Promise<SchemaChangeFixResult | null> {
	const {
		aiCoreService,
		provider,
		connection,
		connectionType,
		changeType,
		targetTableName,
		originalUserPrompt,
		failingSql,
		failingRollbackSql,
		executionError,
		logger,
	} = opts;

	const systemPrompt = buildFixSystemPrompt(connectionType, changeType, targetTableName);
	const humanPrompt = buildFixHumanPrompt(originalUserPrompt, failingSql, failingRollbackSql, executionError);
	const messages = new MessageBuilder().system(systemPrompt).human(humanPrompt).build();

	const tools = isMongoDialect(connectionType)
		? createMongoSchemaChangeTools()
		: isDynamoDbDialect(connectionType)
			? createDynamoDbSchemaChangeTools()
			: isElasticsearchDialect(connectionType)
				? createElasticsearchSchemaChangeTools()
				: createSchemaChangeTools();

	const dao = getDataAccessObject(connection);

	const result = await runSchemaChangeAiLoop({
		aiCoreService,
		provider,
		messages,
		tools,
		dao,
		userEmail: undefined,
		logger,
		maxDepth: 4,
	});

	if (result.kind !== 'proposals') {
		logger?.warn(`AI fix loop returned ${result.kind} instead of proposals; treating as fix-failed.`);
		return null;
	}

	if (result.proposals.length !== 1) {
		logger?.warn(
			`AI fix loop returned ${result.proposals.length} proposals; expected exactly 1. Treating as fix-failed.`,
		);
		return null;
	}

	const proposal = result.proposals[0];

	if (proposal.changeType !== changeType) {
		logger?.warn(
			`AI fix loop changed changeType from ${changeType} to ${proposal.changeType}; treating as fix-failed.`,
		);
		return null;
	}
	if (proposal.targetTableName !== targetTableName) {
		logger?.warn(
			`AI fix loop changed targetTableName from ${targetTableName} to ${proposal.targetTableName}; treating as fix-failed.`,
		);
		return null;
	}
	if (!proposal.forwardSql || proposal.forwardSql.trim() === failingSql.trim()) {
		logger?.warn('AI fix loop returned an identical or empty forwardSql; treating as fix-failed.');
		return null;
	}

	return { fixedProposal: proposal };
}

function buildFixSystemPrompt(
	connectionType: ConnectionTypesEnum,
	changeType: SchemaChangeTypeEnum,
	targetTableName: string,
): string {
	return `You are a DDL repair assistant for ${connectionType}.

A previously proposed schema change failed when applied against the live database. Your single job is to repair the failing statement and emit a corrected proposal via the appropriate proposeSchemaChange tool.

Hard constraints (violations will be rejected and the fix discarded):
- Emit EXACTLY ONE proposal.
- The proposal MUST keep changeType = "${changeType}".
- The proposal MUST keep targetTableName = "${targetTableName}".
- The corrected forwardSql MUST be different from the failing forwardSql.
- All previously documented rules for ${changeType} on ${connectionType} still apply (single statement, dialect-correct identifier quoting, no DML, etc.).

Workflow:
1. Read the database error carefully. Identify the precise cause (missing dependency, wrong type, reserved word, conflicting name, etc.).
2. If — and only if — the fix depends on inspecting the live structure of an existing table or collection, call getTableStructure first.
3. Emit the corrected proposal via the appropriate proposeSchemaChange / proposeMongoSchemaChange / proposeDynamoDbSchemaChange / proposeElasticsearchSchemaChange tool.

Do NOT reply with free text. If you cannot produce a corrected statement, still emit a proposal with your best attempt and explain the residual risk in "reasoning".`;
}

function buildFixHumanPrompt(
	originalUserPrompt: string,
	failingSql: string,
	failingRollbackSql: string | null,
	executionError: string,
): string {
	return `Original user request:
${originalUserPrompt}

Failing forwardSql:
${failingSql}

Previously proposed rollbackSql:
${failingRollbackSql ?? '(none)'}

Database error returned when applying forwardSql:
${executionError}

Produce a corrected proposal that addresses the database error while still fulfilling the user's original request.`;
}
