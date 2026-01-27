import { Global, Module } from '@nestjs/common';
import { LangchainOpenAIProvider } from './providers/langchain-openai.provider.js';
import { LangchainBedrockProvider } from './providers/langchain-bedrock.provider.js';
import { AICoreService } from './services/ai-core.service.js';

export const AI_CORE_SERVICE = 'AI_CORE_SERVICE';

@Global()
@Module({
	providers: [
		LangchainOpenAIProvider,
		LangchainBedrockProvider,
		AICoreService,
		{
			provide: AI_CORE_SERVICE,
			useExisting: AICoreService,
		},
	],
	exports: [AICoreService, AI_CORE_SERVICE, LangchainOpenAIProvider, LangchainBedrockProvider],
})
export class AICoreModule {}
