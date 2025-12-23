import { Injectable } from '@nestjs/common';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { IAIProvider } from './ai-provider.interface.js';

@Injectable()
export class AmazonBedrockAiProvider implements IAIProvider {
	private readonly bedrockRuntimeClient: BedrockRuntimeClient;
	private readonly modelId: string = 'global.anthropic.claude-sonnet-4-5-20250929-v1:0';
	private readonly maxTokens: number = 1024;

	constructor() {
		this.bedrockRuntimeClient = new BedrockRuntimeClient();
	}
	public async generateResponse(prompt: string): Promise<string> {
		const conversation = [
			{
				role: 'user' as const,
				content: [{ text: prompt }],
			},
		];

		const command = new ConverseCommand({
			modelId: this.modelId,
			messages: conversation,
			inferenceConfig: { maxTokens: this.maxTokens },
		});
		try {
			const response = await this.bedrockRuntimeClient.send(command);
			console.info('AI response received from Amazon Bedrock.');
			const responseText = response.output.message?.content[0].text;
			console.info('AI response text. ', responseText);
			return responseText || 'No response generated.';
		} catch (error) {
			console.error('Error generating AI response:', error);
			throw new Error('Failed to generate AI response.');
		}
	}
}
