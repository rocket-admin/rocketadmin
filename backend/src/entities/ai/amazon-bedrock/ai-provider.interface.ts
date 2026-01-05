export interface IAIProvider {
	generateResponse(prompt: string): Promise<string>;
}
