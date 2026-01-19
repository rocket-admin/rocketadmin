import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import {
	BaseMessage,
	AIMessage,
	AIMessageChunk,
	HumanMessage,
	ToolMessage,
} from '@langchain/core/messages';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import OpenAI from 'openai';
import {
	IAIProvider,
	AIProviderConfig,
	AICompletionResult,
	AIStreamChunk,
	AIToolDefinition,
	AIToolResult,
	AIToolCall,
} from '../interfaces/ai-provider.interface.js';
import { getRequiredEnvVariable } from '../../helpers/app/get-requeired-env-variable.js';

@Injectable()
export class LangchainOpenAIProvider implements IAIProvider {
	private readonly defaultModelId = 'gpt-4o';
	private readonly responsesApiModel = 'gpt-4o';
	private openaiClient: OpenAI;

	constructor() {
		const apiKey = getRequiredEnvVariable('OPENAI_API_KEY');
		this.openaiClient = new OpenAI({ apiKey });
	}

	private createModel(config?: AIProviderConfig): ChatOpenAI {
		const apiKey = getRequiredEnvVariable('OPENAI_API_KEY');
		return new ChatOpenAI({
			openAIApiKey: apiKey,
			modelName: config?.modelId || this.defaultModelId,
			temperature: config?.temperature ?? 0.7,
			maxTokens: config?.maxTokens,
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
		return this.streamWithResponsesApi(messages, tools, config || {});
	}

	private async streamWithResponsesApi(
		messages: BaseMessage[],
		tools: AIToolDefinition[],
		config: AIProviderConfig,
	): Promise<IterableReadableStream<AIStreamChunk>> {
		const systemMessage = messages.find((m) => m._getType() === 'system');
		const systemPrompt = systemMessage ? (systemMessage.content as string) : '';

		const openaiTools = this.convertToolsToOpenAIFormat(tools);

		const input = this.buildResponsesApiInput(messages);

		const stream = await this.openaiClient.responses.create({
			model: config.modelId || this.responsesApiModel,
			input: input,
			instructions: systemPrompt,
			tools: openaiTools,
			tool_choice: 'auto',
			stream: true,
			previous_response_id: config.previousResponseId,
		});

		return this.transformResponsesApiStream(stream);
	}

	private buildResponsesApiInput(messages: BaseMessage[]): string | OpenAI.Responses.ResponseInputItem[] {
		const toolMessages = messages.filter((m) => m._getType() === 'tool');

		if (toolMessages.length > 0) {
			const inputItems: OpenAI.Responses.ResponseInputItem[] = [];

			for (const msg of toolMessages) {
				const toolMsg = msg as ToolMessage;
				inputItems.push({
					type: 'function_call_output',
					call_id: toolMsg.tool_call_id,
					output: typeof toolMsg.content === 'string' ? toolMsg.content : JSON.stringify(toolMsg.content),
				});
			}

			return inputItems;
		}

		const humanMessage = messages.find((m) => m._getType() === 'human');
		const userMessage = humanMessage ? (humanMessage.content as string) : '';
		return userMessage;
	}

	private convertToolsToOpenAIFormat(tools: AIToolDefinition[]): OpenAI.Responses.FunctionTool[] {
		return tools.map((toolDef) => ({
			type: 'function' as const,
			name: toolDef.name,
			description: toolDef.description,
			parameters: toolDef.parameters as OpenAI.FunctionParameters,
			strict: false,
		}));
	}

	private async transformResponsesApiStream(
		stream: AsyncIterable<OpenAI.Responses.ResponseStreamEvent>,
	): Promise<IterableReadableStream<AIStreamChunk>> {
		async function* generateChunks(): AsyncGenerator<AIStreamChunk> {
			let currentResponseId: string | null = null;

			for await (const event of stream) {
				if (event.type === 'response.created') {
					currentResponseId = event.response.id;
				}

				if (event.type === 'response.output_text.delta') {
					yield {
						type: 'text',
						content: event.delta,
						responseId: currentResponseId || undefined,
					};
				}
				if (event.type === 'response.output_item.done' && event.item?.type === 'function_call') {
					const item = event.item;
					let parsedArgs: Record<string, unknown> = {};
					try {
						parsedArgs = JSON.parse(item.arguments || '{}');
					} catch {
						// Failed to parse arguments
					}

					const toolCall: AIToolCall = {
						id: item.call_id || item.id || '',
						name: item.name || '',
						arguments: parsedArgs,
					};

					yield {
						type: 'tool_call',
						toolCall,
						responseId: currentResponseId || undefined,
					};
				}
			}

			yield { type: 'done', responseId: currentResponseId || undefined };
		}

		const generator = generateChunks();
		return IterableReadableStream.fromAsyncGenerator(generator);
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
		return 'OpenAI';
	}

	public getDefaultModelId(): string {
		return this.defaultModelId;
	}

	private async transformToAIStreamChunks(
		stream: AsyncIterable<AIMessageChunk>,
	): Promise<IterableReadableStream<AIStreamChunk>> {
		async function* generateChunks(): AsyncGenerator<AIStreamChunk> {
			const currentToolCalls: Map<number, { id: string; name: string; argsString: string }> = new Map();

			try {
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
			} catch (streamError) {
				throw streamError;
			}

			for (const [index, toolCallData] of currentToolCalls.entries()) {
				if (toolCallData.name) {
					let parsedArgs: Record<string, unknown> = {};
					if (toolCallData.argsString) {
						try {
							parsedArgs = JSON.parse(toolCallData.argsString);
						} catch {
							// Failed to parse args
						}
					}

					const toolCall: AIToolCall = {
						id: toolCallData.id,
						name: toolCallData.name,
						arguments: parsedArgs,
					};

					yield {
						type: 'tool_call',
						toolCall,
					};
				}
			}

			yield { type: 'done' };
		}

		const generator = generateChunks();
		return IterableReadableStream.fromAsyncGenerator(generator);
	}
}
