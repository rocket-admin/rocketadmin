import { BaseMessage } from '@langchain/core/messages';
import { Logger } from '@nestjs/common';
import { IDataAccessObject } from '@rocketadmin/shared-code/dist/src/shared/interfaces/data-access-object.interface.js';
import { IDataAccessObjectAgent } from '@rocketadmin/shared-code/dist/src/shared/interfaces/data-access-object-agent.interface.js';
import {
	AICoreService,
	AIProviderConfig,
	AIProviderType,
	AIToolCall,
	AIToolDefinition,
	encodeError,
	encodeToToon,
	MessageBuilder,
} from '../../../ai-core/index.js';
import { isMongoSchemaChangeType, SchemaChangeTypeEnum } from '../table-schema-change-enums.js';
import {
	GET_TABLE_STRUCTURE_TOOL_NAME,
	PROPOSE_MONGO_SCHEMA_CHANGE_TOOL_NAME,
	ProposeSchemaChangeArgs,
	TERMINAL_PROPOSAL_TOOL_NAMES,
} from './schema-change-tools.js';

export interface RunSchemaChangeAiLoopOptions {
	aiCoreService: AICoreService;
	provider: AIProviderType;
	messages: BaseMessage[];
	tools: AIToolDefinition[];
	dao: IDataAccessObject | IDataAccessObjectAgent;
	userEmail: string | undefined;
	maxDepth?: number;
	logger?: Logger;
}

export interface SchemaChangeAiLoopResult {
	proposal: ProposeSchemaChangeArgs;
	responseId: string | null;
}

export async function runSchemaChangeAiLoop(opts: RunSchemaChangeAiLoopOptions): Promise<SchemaChangeAiLoopResult> {
	const { aiCoreService, provider, dao, userEmail, logger } = opts;
	const maxDepth = opts.maxDepth ?? 6;

	let currentMessages = [...opts.messages];
	let currentConfig: AIProviderConfig = {};
	let lastResponseId: string | null = null;

	for (let depth = 0; depth < maxDepth; depth++) {
		const stream = await aiCoreService.streamChatWithToolsAndProvider(
			provider,
			currentMessages,
			opts.tools,
			currentConfig,
		);

		const pendingToolCalls: AIToolCall[] = [];
		let accumulatedContent = '';

		for await (const chunk of stream) {
			if (chunk.type === 'text' && chunk.content) {
				accumulatedContent += chunk.content;
			}
			if (chunk.type === 'tool_call' && chunk.toolCall) {
				pendingToolCalls.push(chunk.toolCall);
			}
			if (chunk.responseId) {
				lastResponseId = chunk.responseId;
			}
		}

		logger?.log(
			`AI loop depth=${depth + 1}: toolCalls=[${pendingToolCalls.map((t) => t.name).join(', ')}], textLen=${accumulatedContent.length}`,
		);

		const proposalCall = pendingToolCalls.find((tc) => TERMINAL_PROPOSAL_TOOL_NAMES.has(tc.name));
		if (proposalCall) {
			const proposal = coerceAndValidateProposal(proposalCall);
			return { proposal, responseId: lastResponseId };
		}

		if (pendingToolCalls.length === 0) {
			const hint = accumulatedContent
				? `AI replied with text but no tool call: "${accumulatedContent.slice(0, 200)}"`
				: 'AI produced no tool calls and no text.';
			throw new Error(
				`${hint} The model must call proposeSchemaChange (SQL) or proposeMongoSchemaChange (Mongo) with structured arguments.`,
			);
		}

		const toolResults = await executeInspectionToolCalls(pendingToolCalls, dao, userEmail, logger);

		if (provider === AIProviderType.OPENAI && lastResponseId) {
			currentConfig = { ...currentConfig, previousResponseId: lastResponseId };
		}

		const continuation = MessageBuilder.fromMessages(currentMessages);
		continuation.ai(accumulatedContent, pendingToolCalls);
		for (const result of toolResults) {
			continuation.toolResult(result.toolCallId, result.result);
		}
		currentMessages = continuation.build();
	}

	throw new Error(`AI did not produce a proposal within ${maxDepth} iterations.`);
}

function coerceAndValidateProposal(toolCall: AIToolCall): ProposeSchemaChangeArgs {
	const args = toolCall.arguments ?? {};
	const raw = args as Record<string, unknown>;

	if (Object.keys(raw).length === 0) {
		throw new Error(
			`AI returned ${toolCall.name} with empty arguments — the underlying tool-call JSON likely failed to parse.`,
		);
	}

	const targetTableName = asNonEmptyString(raw.targetTableName, 'targetTableName');
	const summary = asString(raw.summary) ?? '';
	const reasoning = asString(raw.reasoning) ?? '';
	const changeType = asChangeType(raw.changeType);
	const isReversible = asBoolean(raw.isReversible, 'isReversible');

	const isMongoTool = toolCall.name === PROPOSE_MONGO_SCHEMA_CHANGE_TOOL_NAME;
	if (isMongoTool !== isMongoSchemaChangeType(changeType)) {
		throw new Error(
			`Tool ${toolCall.name} was called with changeType "${changeType}" which does not match. Mongo tool requires MONGO_* changeType and vice versa.`,
		);
	}

	if (isMongoTool) {
		const forwardOp = asNonEmptyString(raw.forwardOp, 'forwardOp');
		const rollbackOp = asNonEmptyString(raw.rollbackOp, 'rollbackOp');
		return {
			forwardSql: forwardOp,
			rollbackSql: rollbackOp,
			changeType,
			targetTableName,
			isReversible,
			summary,
			reasoning,
		};
	}

	const forwardSql = asNonEmptyString(raw.forwardSql, 'forwardSql');
	const rollbackSql = asNonEmptyString(raw.rollbackSql, 'rollbackSql');
	return { forwardSql, rollbackSql, changeType, targetTableName, isReversible, summary, reasoning };
}

function asString(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

function asNonEmptyString(value: unknown, fieldName: string): string {
	const str = asString(value);
	if (!str || str.trim().length === 0) {
		throw new Error(`proposeSchemaChange is missing required string field "${fieldName}".`);
	}
	return str;
}

function asBoolean(value: unknown, fieldName: string): boolean {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string') {
		if (value.toLowerCase() === 'true') return true;
		if (value.toLowerCase() === 'false') return false;
	}
	throw new Error(`proposeSchemaChange field "${fieldName}" must be a boolean; received ${JSON.stringify(value)}.`);
}

function asChangeType(value: unknown): SchemaChangeTypeEnum {
	if (typeof value !== 'string') {
		throw new Error(`proposeSchemaChange "changeType" must be a string; received ${JSON.stringify(value)}.`);
	}
	if ((Object.values(SchemaChangeTypeEnum) as string[]).includes(value)) {
		return value as SchemaChangeTypeEnum;
	}
	throw new Error(
		`proposeSchemaChange "changeType" "${value}" is not one of ${Object.values(SchemaChangeTypeEnum).join(', ')}.`,
	);
}

async function executeInspectionToolCalls(
	toolCalls: AIToolCall[],
	dao: IDataAccessObject | IDataAccessObjectAgent,
	userEmail: string | undefined,
	logger?: Logger,
): Promise<Array<{ toolCallId: string; result: string }>> {
	const results: Array<{ toolCallId: string; result: string }> = [];
	for (const tc of toolCalls) {
		let result: string;
		try {
			if (tc.name === GET_TABLE_STRUCTURE_TOOL_NAME) {
				const tableName = tc.arguments.tableName as string;
				if (!tableName) throw new Error('Missing argument "tableName"');
				const structure = await dao.getTableStructure(tableName, userEmail);
				const foreignKeys = await dao.getTableForeignKeys(tableName, userEmail);
				result = encodeToToon({ tableName, structure, foreignKeys });
			} else if (TERMINAL_PROPOSAL_TOOL_NAMES.has(tc.name)) {
				result = encodeError({
					error: `${tc.name} is a terminal tool; it should be the only tool call in the final round.`,
				});
			} else {
				result = encodeError({ error: `Unknown tool: ${tc.name}` });
			}
		} catch (err) {
			logger?.error(`Tool call ${tc.name} failed: ${(err as Error).message}`);
			result = encodeError({ error: (err as Error).message });
		}
		results.push({ toolCallId: tc.id, result });
	}
	return results;
}
