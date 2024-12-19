import OpenAI from 'openai';
import { getRequiredEnvVariable } from '../../../helpers/app/get-requeired-env-variable.js';

export function getOpenAiClient(): { openai: OpenAI; assistantId: string } {
  const openApiKey = getRequiredEnvVariable('OPENAI_API_KEY');
  const assistantId = getRequiredEnvVariable('OPENAI_ASSISTANT_ID');
  const openai = new OpenAI({ apiKey: openApiKey });
  return { openai, assistantId };
}
