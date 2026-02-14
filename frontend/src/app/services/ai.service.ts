import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

export interface AiStreamResponse {
	threadId: string;
	stream: AsyncGenerator<string>;
}

@Injectable({
	providedIn: 'root',
})
export class AiService {
	private _api = inject(ApiService);

	async createThread(
		connectionId: string,
		tableName: string,
		message: string,
		signal?: AbortSignal,
	): Promise<AiStreamResponse | null> {
		const result = await this._api.postStream(
			`/ai/v4/request/${connectionId}`,
			{ user_message: message },
			{ params: { tableName }, signal },
		);

		if (!result) return null;

		return {
			threadId: result.headers.get('X-OpenAI-Thread-ID'),
			stream: result.stream,
		};
	}

	async sendMessage(
		connectionId: string,
		tableName: string,
		threadId: string,
		message: string,
		signal?: AbortSignal,
	): Promise<AsyncGenerator<string> | null> {
		const result = await this._api.postStream(
			`/ai/v4/request/${connectionId}`,
			{ user_message: message },
			{ params: { tableName, threadId }, signal },
		);

		return result?.stream ?? null;
	}
}
