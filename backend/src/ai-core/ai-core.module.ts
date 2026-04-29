import { Global, Module } from '@nestjs/common';
import { LangchainBedrockProvider } from './providers/langchain-bedrock.provider.js';
import { AICoreService } from './services/ai-core.service.js';

export const AI_CORE_SERVICE = 'AI_CORE_SERVICE';

@Global()
@Module({
	providers: [
		LangchainBedrockProvider,
		AICoreService,
		{
			provide: AI_CORE_SERVICE,
			useExisting: AICoreService,
		},
	],
	exports: [AICoreService, AI_CORE_SERVICE, LangchainBedrockProvider],
})
export class AICoreModule {}
