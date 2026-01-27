import { Injectable } from '@nestjs/common';
import { BaseMessage } from '@langchain/core/messages';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import { IAIService, AIProviderType } from '../interfaces/ai-service.interface.js';
import {
	AIProviderConfig,
	AICompletionResult,
	AIStreamChunk,
	AIToolDefinition,
	AIToolResult,
	IAIProvider,
} from '../interfaces/ai-provider.interface.js';
import { LangchainOpenAIProvider } from '../providers/langchain-openai.provider.js';
import { LangchainBedrockProvider } from '../providers/langchain-bedrock.provider.js';

@Injectable()
export class AICoreService implements IAIService {
	private defaultProvider: AIProviderType = AIProviderType.OPENAI;

	constructor(
		private readonly openAIProvider: LangchainOpenAIProvider,
		private readonly bedrockProvider: LangchainBedrockProvider,
	) {}

	private getProvider(type?: AIProviderType): IAIProvider {
		const providerType = type || this.defaultProvider;
		switch (providerType) {
			case AIProviderType.OPENAI:
				return this.openAIProvider;
			case AIProviderType.BEDROCK:
				return this.bedrockProvider;
			default:
				throw new Error(`Unknown provider type: ${providerType}`);
		}
	}

	public async complete(prompt: string, config?: AIProviderConfig): Promise<string> {
		return this.getProvider().generateCompletion(prompt, config);
	}

	public async completeWithProvider(
		provider: AIProviderType,
		prompt: string,
		config?: AIProviderConfig,
	): Promise<string> {
		return this.getProvider(provider).generateCompletion(prompt, config);
	}

	public async chat(messages: BaseMessage[], config?: AIProviderConfig): Promise<AICompletionResult> {
		return this.getProvider().generateChatCompletion(messages, config);
	}

	public async chatWithProvider(
		provider: AIProviderType,
		messages: BaseMessage[],
		config?: AIProviderConfig,
	): Promise<AICompletionResult> {
		return this.getProvider(provider).generateChatCompletion(messages, config);
	}

	public async streamChat(
		messages: BaseMessage[],
		config?: AIProviderConfig,
	): Promise<IterableReadableStream<AIStreamChunk>> {
		return this.getProvider().generateStreamingCompletion(messages, config);
	}

	public async streamChatWithProvider(
		provider: AIProviderType,
		messages: BaseMessage[],
		config?: AIProviderConfig,
	): Promise<IterableReadableStream<AIStreamChunk>> {
		return this.getProvider(provider).generateStreamingCompletion(messages, config);
	}

	public async chatWithTools(
		messages: BaseMessage[],
		tools: AIToolDefinition[],
		config?: AIProviderConfig,
	): Promise<AICompletionResult> {
		return this.getProvider().generateWithTools(messages, tools, config);
	}

	public async chatWithToolsAndProvider(
		provider: AIProviderType,
		messages: BaseMessage[],
		tools: AIToolDefinition[],
		config?: AIProviderConfig,
	): Promise<AICompletionResult> {
		return this.getProvider(provider).generateWithTools(messages, tools, config);
	}

	public async streamChatWithTools(
		messages: BaseMessage[],
		tools: AIToolDefinition[],
		config?: AIProviderConfig,
	): Promise<IterableReadableStream<AIStreamChunk>> {
		return this.getProvider().generateStreamingWithTools(messages, tools, config);
	}

	public async streamChatWithToolsAndProvider(
		provider: AIProviderType,
		messages: BaseMessage[],
		tools: AIToolDefinition[],
		config?: AIProviderConfig,
	): Promise<IterableReadableStream<AIStreamChunk>> {
		return this.getProvider(provider).generateStreamingWithTools(messages, tools, config);
	}

	public async continueAfterToolCall(
		messages: BaseMessage[],
		toolResults: AIToolResult[],
		tools: AIToolDefinition[],
		config?: AIProviderConfig,
	): Promise<AICompletionResult> {
		return this.getProvider().continueWithToolResults(messages, toolResults, tools, config);
	}

	public async continueStreamingAfterToolCall(
		messages: BaseMessage[],
		toolResults: AIToolResult[],
		tools: AIToolDefinition[],
		config?: AIProviderConfig,
	): Promise<IterableReadableStream<AIStreamChunk>> {
		return this.getProvider().continueStreamingWithToolResults(messages, toolResults, tools, config);
	}

	public getDefaultProvider(): AIProviderType {
		return this.defaultProvider;
	}

	public setDefaultProvider(provider: AIProviderType): void {
		this.defaultProvider = provider;
	}

	public getAvailableProviders(): Array<{ type: AIProviderType; name: string; defaultModel: string }> {
		return [
			{
				type: AIProviderType.OPENAI,
				name: this.openAIProvider.getProviderName(),
				defaultModel: this.openAIProvider.getDefaultModelId(),
			},
			{
				type: AIProviderType.BEDROCK,
				name: this.bedrockProvider.getProviderName(),
				defaultModel: this.bedrockProvider.getDefaultModelId(),
			},
		];
	}
}
