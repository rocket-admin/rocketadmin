import { BaseMessage } from '@langchain/core/messages';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import {
	AICompletionResult,
	AIProviderConfig,
	AIStreamChunk,
	AIToolDefinition,
	AIToolResult,
} from './ai-provider.interface.js';

export enum AIProviderType {
	OPENAI = 'openai',
	BEDROCK = 'bedrock',
}

export interface IAIService {
	complete(prompt: string, config?: AIProviderConfig): Promise<string>;

	completeWithProvider(provider: AIProviderType, prompt: string, config?: AIProviderConfig): Promise<string>;

	chat(messages: BaseMessage[], config?: AIProviderConfig): Promise<AICompletionResult>;

	chatWithProvider(
		provider: AIProviderType,
		messages: BaseMessage[],
		config?: AIProviderConfig,
	): Promise<AICompletionResult>;

	streamChat(messages: BaseMessage[], config?: AIProviderConfig): Promise<IterableReadableStream<AIStreamChunk>>;

	streamChatWithProvider(
		provider: AIProviderType,
		messages: BaseMessage[],
		config?: AIProviderConfig,
	): Promise<IterableReadableStream<AIStreamChunk>>;

	chatWithTools(
		messages: BaseMessage[],
		tools: AIToolDefinition[],
		config?: AIProviderConfig,
	): Promise<AICompletionResult>;

	chatWithToolsAndProvider(
		provider: AIProviderType,
		messages: BaseMessage[],
		tools: AIToolDefinition[],
		config?: AIProviderConfig,
	): Promise<AICompletionResult>;

	streamChatWithTools(
		messages: BaseMessage[],
		tools: AIToolDefinition[],
		config?: AIProviderConfig,
	): Promise<IterableReadableStream<AIStreamChunk>>;

	streamChatWithToolsAndProvider(
		provider: AIProviderType,
		messages: BaseMessage[],
		tools: AIToolDefinition[],
		config?: AIProviderConfig,
	): Promise<IterableReadableStream<AIStreamChunk>>;

	continueAfterToolCall(
		messages: BaseMessage[],
		toolResults: AIToolResult[],
		tools: AIToolDefinition[],
		config?: AIProviderConfig,
	): Promise<AICompletionResult>;

	continueStreamingAfterToolCall(
		messages: BaseMessage[],
		toolResults: AIToolResult[],
		tools: AIToolDefinition[],
		config?: AIProviderConfig,
	): Promise<IterableReadableStream<AIStreamChunk>>;

	getDefaultProvider(): AIProviderType;

	setDefaultProvider(provider: AIProviderType): void;
}
