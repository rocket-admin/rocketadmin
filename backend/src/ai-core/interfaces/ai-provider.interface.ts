import { BaseMessage } from '@langchain/core/messages';
import { IterableReadableStream } from '@langchain/core/utils/stream';

export interface AIProviderConfig {
	modelId?: string;
	temperature?: number;
	maxTokens?: number;
	streaming?: boolean;
	previousResponseId?: string; // For conversation continuation (OpenAI Responses API)
}

export interface AIToolDefinition {
	name: string;
	description: string;
	parameters: Record<string, unknown>;
}

export interface AIToolCall {
	id: string;
	name: string;
	arguments: Record<string, unknown>;
}

export interface AIToolResult {
	toolCallId: string;
	result: string;
}

export interface AIStreamChunk {
	type: 'text' | 'tool_call' | 'tool_result' | 'done';
	content?: string;
	toolCall?: AIToolCall;
	responseId?: string;
}

export interface AICompletionResult {
	content: string;
	toolCalls?: AIToolCall[];
	responseId?: string;
}

export interface IAIProvider {
	generateCompletion(prompt: string, config?: AIProviderConfig): Promise<string>;

	generateChatCompletion(messages: BaseMessage[], config?: AIProviderConfig): Promise<AICompletionResult>;

	generateStreamingCompletion(
		messages: BaseMessage[],
		config?: AIProviderConfig,
	): Promise<IterableReadableStream<AIStreamChunk>>;

	generateWithTools(
		messages: BaseMessage[],
		tools: AIToolDefinition[],
		config?: AIProviderConfig,
	): Promise<AICompletionResult>;

	generateStreamingWithTools(
		messages: BaseMessage[],
		tools: AIToolDefinition[],
		config?: AIProviderConfig,
	): Promise<IterableReadableStream<AIStreamChunk>>;

	continueWithToolResults(
		messages: BaseMessage[],
		toolResults: AIToolResult[],
		tools: AIToolDefinition[],
		config?: AIProviderConfig,
	): Promise<AICompletionResult>;

	continueStreamingWithToolResults(
		messages: BaseMessage[],
		toolResults: AIToolResult[],
		tools: AIToolDefinition[],
		config?: AIProviderConfig,
	): Promise<IterableReadableStream<AIStreamChunk>>;

	getProviderName(): string;

	getDefaultModelId(): string;
}
