import { AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { AIToolCall } from '../interfaces/ai-provider.interface.js';

export class MessageBuilder {
	private messages: BaseMessage[] = [];

	public system(content: string): MessageBuilder {
		this.messages.push(new SystemMessage(content));
		return this;
	}

	public human(content: string): MessageBuilder {
		this.messages.push(new HumanMessage(content));
		return this;
	}

	public ai(content: string, toolCalls?: AIToolCall[]): MessageBuilder {
		const message = new AIMessage({
			content,
			tool_calls: toolCalls?.map((tc) => ({
				id: tc.id,
				name: tc.name,
				args: tc.arguments,
			})),
		});
		this.messages.push(message);
		return this;
	}

	public toolResult(toolCallId: string, result: string): MessageBuilder {
		this.messages.push(
			new ToolMessage({
				tool_call_id: toolCallId,
				content: result,
			}),
		);
		return this;
	}

	public toolResults(results: Array<{ toolCallId: string; result: string }>): MessageBuilder {
		for (const result of results) {
			this.toolResult(result.toolCallId, result.result);
		}
		return this;
	}

	public build(): BaseMessage[] {
		return this.messages;
	}

	public clear(): MessageBuilder {
		this.messages = [];
		return this;
	}

	public get length(): number {
		return this.messages.length;
	}

	public static fromMessages(messages: BaseMessage[]): MessageBuilder {
		const builder = new MessageBuilder();
		builder.messages = [...messages];
		return builder;
	}
}

export function createSimpleMessages(systemPrompt: string, userMessage: string): BaseMessage[] {
	return new MessageBuilder().system(systemPrompt).human(userMessage).build();
}

export { HumanMessage, SystemMessage, AIMessage, ToolMessage, BaseMessage };
