// Port of AiService (and the `AiStreamChunk` type from api.service.ts): the table AI panel's chat.
// Both calls POST to the same NDJSON endpoint; the first one gets the thread id from a header.
//
// A failed request is reported by the client and the notified ApiError is thrown, like every store.
// An aborted request (the user pressed stop) still resolves null, as in Angular: the AI panel treats
// null as "nothing to show" and would otherwise render the abort as an error message.
import { defineStore } from 'pinia';
import { api, isAbortError } from '@/api/client';

export type AiStreamChunk =
	| { type: 'thinking'; content: string }
	| { type: 'thinking_reset' }
	| { type: 'thinking_commit' }
	| { type: 'text'; content: string };

export interface AiStreamResponse {
	threadId: string | null;
	stream: AsyncGenerator<AiStreamChunk>;
}

export const useAiStore = defineStore('ai', () => {
	/** Resolves `null` when aborted through `signal`; throws the (notified) ApiError on failure. */
	async function createThread(
		connectionId: string,
		tableName: string,
		message: string,
		signal?: AbortSignal,
	): Promise<AiStreamResponse | null> {
		const result = await nullIfAborted(
			api.stream<unknown>(
				`/ai/v4/request/${connectionId}`,
				{ user_message: message },
				{ params: { tableName }, signal },
			),
		);
		if (!result) return null;
		return { threadId: result.headers.get('X-OpenAI-Thread-ID'), stream: onlyChunks(result.stream) };
	}

	async function sendMessage(
		connectionId: string,
		tableName: string,
		threadId: string,
		message: string,
		signal?: AbortSignal,
	): Promise<AsyncGenerator<AiStreamChunk> | null> {
		const result = await nullIfAborted(
			api.stream<unknown>(
				`/ai/v4/request/${connectionId}`,
				{ user_message: message },
				{ params: { tableName, threadId }, signal },
			),
		);
		return result ? onlyChunks(result.stream) : null;
	}

	return { createThread, sendMessage };
});

/** api.service.ts's tryParseChunk: lines that parse but aren't `{ type: string }` objects are dropped. */
export function isAiStreamChunk(value: unknown): value is AiStreamChunk {
	return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
}

async function nullIfAborted<T>(request: Promise<T>): Promise<T | null> {
	try {
		return await request;
	} catch (error) {
		if (isAbortError(error)) return null;
		throw error;
	}
}

async function* onlyChunks(stream: AsyncGenerator<unknown>): AsyncGenerator<AiStreamChunk> {
	for await (const value of stream) {
		if (isAiStreamChunk(value)) yield value;
	}
}
