import { Injectable } from '@nestjs/common';
import { ChatBedrockConverse } from '@langchain/aws';
import { BaseMessage, AIMessage, AIMessageChunk, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import {
	IAIProvider,
	AIProviderConfig,
	AICompletionResult,
	AIStreamChunk,
	AIToolDefinition,
	AIToolResult,
	AIToolCall,
} from '../interfaces/ai-provider.interface.js';

@Injectable()
export class LangchainBedrockProvider implements IAIProvider {
	private readonly defaultModelId = 'global.anthropic.claude-sonnet-4-5-20250929-v1:0';

	private createModel(config?: AIProviderConfig): ChatBedrockConverse {
		return new ChatBedrockConverse({
			model: config?.modelId || this.defaultModelId,
			temperature: config?.temperature ?? 0.7,
			maxTokens: config?.maxTokens ?? 4096,
			streaming: config?.streaming ?? false,
		});
	}

	private convertToolsToLangchain(tools: AIToolDefinition[]) {
		return tools.map((toolDef) => {
			const schemaProperties: Record<string, z.ZodTypeAny> = {};
			const properties = (toolDef.parameters as { properties?: Record<string, { type: string; description?: string }> })
				.properties;
			const required = (toolDef.parameters as { required?: string[] }).required || [];

			if (properties) {
				for (const [key, value] of Object.entries(properties)) {
					let zodType: z.ZodTypeAny;
					switch (value.type) {
						case 'string':
							zodType = z.string().describe(value.description || '');
							break;
						case 'number':
							zodType = z.number().describe(value.description || '');
							break;
						case 'boolean':
							zodType = z.boolean().describe(value.description || '');
							break;
						case 'array':
							zodType = z.array(z.any()).describe(value.description || '');
							break;
						case 'object':
							zodType = z.record(z.string(), z.any()).describe(value.description || '');
							break;
						default:
							zodType = z.any().describe(value.description || '');
					}
					schemaProperties[key] = required.includes(key) ? zodType : zodType.optional();
				}
			}

			return tool(async (_input) => '', {
				name: toolDef.name,
				description: toolDef.description,
				schema: z.object(schemaProperties),
			});
		});
	}

	private extractToolCalls(message: AIMessage): AIToolCall[] {
		if (!message.tool_calls || message.tool_calls.length === 0) {
			return [];
		}

		return message.tool_calls.map((toolCall) => ({
			id: toolCall.id || '',
			name: toolCall.name,
			arguments: toolCall.args as Record<string, unknown>,
		}));
	}

	public async generateCompletion(prompt: string, config?: AIProviderConfig): Promise<string> {
		const model = this.createModel(config);
		const response = await model.invoke([new HumanMessage(prompt)]);
		return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
	}

	public async generateChatCompletion(messages: BaseMessage[], config?: AIProviderConfig): Promise<AICompletionResult> {
		const model = this.createModel(config);
		const response = await model.invoke(messages);

		return {
			content: typeof response.content === 'string' ? response.content : JSON.stringify(response.content),
			toolCalls: this.extractToolCalls(response),
			responseId: response.id,
		};
	}

	public async generateStreamingCompletion(
		messages: BaseMessage[],
		config?: AIProviderConfig,
	): Promise<IterableReadableStream<AIStreamChunk>> {
		const model = this.createModel({ ...config, streaming: true });
		const stream = await model.stream(messages);

		return this.transformToAIStreamChunks(stream);
	}

	public async generateWithTools(
		messages: BaseMessage[],
		tools: AIToolDefinition[],
		config?: AIProviderConfig,
	): Promise<AICompletionResult> {
		const model = this.createModel(config);
		const langchainTools = this.convertToolsToLangchain(tools);
		const modelWithTools = model.bindTools(langchainTools);
		const response = await modelWithTools.invoke(messages);

		return {
			content: typeof response.content === 'string' ? response.content : JSON.stringify(response.content),
			toolCalls: this.extractToolCalls(response),
			responseId: response.id,
		};
	}

	public async generateStreamingWithTools(
		messages: BaseMessage[],
		tools: AIToolDefinition[],
		config?: AIProviderConfig,
	): Promise<IterableReadableStream<AIStreamChunk>> {
		const model = this.createModel({ ...config, streaming: true });
		const langchainTools = this.convertToolsToLangchain(tools);
		const modelWithTools = model.bindTools(langchainTools);
		const stream = await modelWithTools.stream(messages);

		return this.transformToAIStreamChunks(stream);
	}

	public async continueWithToolResults(
		messages: BaseMessage[],
		toolResults: AIToolResult[],
		tools: AIToolDefinition[],
		config?: AIProviderConfig,
	): Promise<AICompletionResult> {
		const toolMessages = toolResults.map(
			(result) =>
				new ToolMessage({
					tool_call_id: result.toolCallId,
					content: result.result,
				}),
		);

		const allMessages = [...messages, ...toolMessages];
		return this.generateWithTools(allMessages, tools, config);
	}

	public async continueStreamingWithToolResults(
		messages: BaseMessage[],
		toolResults: AIToolResult[],
		tools: AIToolDefinition[],
		config?: AIProviderConfig,
	): Promise<IterableReadableStream<AIStreamChunk>> {
		const toolMessages = toolResults.map(
			(result) =>
				new ToolMessage({
					tool_call_id: result.toolCallId,
					content: result.result,
				}),
		);

		const allMessages = [...messages, ...toolMessages];
		return this.generateStreamingWithTools(allMessages, tools, config);
	}

	public getProviderName(): string {
		return 'Amazon Bedrock';
	}

	public getDefaultModelId(): string {
		return this.defaultModelId;
	}

	private async transformToAIStreamChunks(
		stream: AsyncIterable<AIMessageChunk>,
	): Promise<IterableReadableStream<AIStreamChunk>> {
		async function* generateChunks(): AsyncGenerator<AIStreamChunk> {
			let currentToolCalls: Map<number, { id: string; name: string; argsString: string }> = new Map();

			for await (const chunk of stream) {
				if (chunk.tool_call_chunks && chunk.tool_call_chunks.length > 0) {
					for (const toolCallChunk of chunk.tool_call_chunks) {
						const index = toolCallChunk.index ?? 0;

						if (!currentToolCalls.has(index)) {
							currentToolCalls.set(index, {
								id: toolCallChunk.id || '',
								name: toolCallChunk.name || '',
								argsString: '',
							});
						}

						const currentCall = currentToolCalls.get(index)!;

						if (toolCallChunk.id) {
							currentCall.id = toolCallChunk.id;
						}
						if (toolCallChunk.name) {
							currentCall.name = toolCallChunk.name;
						}
						if (toolCallChunk.args) {
							currentCall.argsString += toolCallChunk.args;
						}
					}
				}

				if (chunk.content) {
					const content = typeof chunk.content === 'string' ? chunk.content : JSON.stringify(chunk.content);
					if (content) {
						yield {
							type: 'text',
							content,
							responseId: chunk.id,
						};
					}
				}
			}

			for (const toolCallData of currentToolCalls.values()) {
				if (toolCallData.name) {
					let parsedArgs: Record<string, unknown> = {};
					if (toolCallData.argsString) {
						try {
							parsedArgs = JSON.parse(toolCallData.argsString);
						} catch {
							// Failed to parse args, use empty object
						}
					}

					yield {
						type: 'tool_call',
						toolCall: {
							id: toolCallData.id,
							name: toolCallData.name,
							arguments: parsedArgs,
						},
					};
				}
			}

			yield { type: 'done' };
		}

		const generator = generateChunks();
		return IterableReadableStream.fromAsyncGenerator(generator);
	}
}
