import { Injectable } from '@nestjs/common';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { IAIProvider } from './ai-provider.interface.js';

@Injectable()
export class AmazonBedrockAiProvider implements IAIProvider {
  private readonly bedrockRuntimeClient: BedrockRuntimeClient;
  private readonly modelId: string = 'global.anthropic.claude-sonnet-4-5-20250929-v1:0';
  private readonly temperature: number = 0.7;
  private readonly maxTokens: number = 1024;
  private readonly region: string = 'us-west-2';
  private readonly topP: number = 0.9;

  constructor() {
    this.bedrockRuntimeClient = new BedrockRuntimeClient({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
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
      inferenceConfig: { maxTokens: this.maxTokens, temperature: this.temperature, topP: this.topP },
    });
    try {
      const response = await this.bedrockRuntimeClient.send(command);
      const responseText = response.output.message?.content[0].text;
      return responseText || 'No response generated.';
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw new Error('Failed to generate AI response.');
    }
  }
}
