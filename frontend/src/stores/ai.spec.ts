import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type AiStreamChunk, isAiStreamChunk, useAiStore } from './ai';
import { useNotificationsStore } from './notifications';

vi.mock('@/environment', () => ({ environment: { apiRoot: '/api', saasURL: '' } }));

function ndjsonResponse(lines: string[], headers: Record<string, string> = {}): Response {
	const encoder = new TextEncoder();
	const body = new ReadableStream<Uint8Array>({
		start(controller) {
			for (const line of lines) controller.enqueue(encoder.encode(line));
			controller.close();
		},
	});
	return new Response(body, { status: 200, headers });
}

async function collect(stream: AsyncGenerator<AiStreamChunk>): Promise<AiStreamChunk[]> {
	const chunks: AiStreamChunk[] = [];
	for await (const chunk of stream) chunks.push(chunk);
	return chunks;
}

describe('ai store', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		setActivePinia(createPinia());
		fetchMock = vi.fn(async () =>
			ndjsonResponse(
				[
					'{"type":"thinking","content":"hm"}\n{"type":"thinking_commit"}\n',
					'{"type":"te',
					'xt","content":"Hello"}\nnot json\n{"no_type":1}\n42\n{"type":"text","content":"!"}',
				],
				{ 'X-OpenAI-Thread-ID': 'thread-1' },
			),
		);
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('createThread posts the message with tableName and returns the thread id and chunk stream', async () => {
		const response = await useAiStore().createThread('c1', 'users', 'How many rows?');

		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('/api/ai/v4/request/c1?tableName=users');
		expect(init.method).toBe('POST');
		expect(JSON.parse(String(init.body))).toEqual({ user_message: 'How many rows?' });
		expect(response?.threadId).toBe('thread-1');
		// Split lines are joined; malformed lines and non-chunk values are dropped.
		expect(await collect(response!.stream)).toEqual([
			{ type: 'thinking', content: 'hm' },
			{ type: 'thinking_commit' },
			{ type: 'text', content: 'Hello' },
			{ type: 'text', content: '!' },
		]);
	});

	it('sendMessage adds the thread id and returns just the stream', async () => {
		const stream = await useAiStore().sendMessage('c1', 'users', 'thread-1', 'And now?');
		const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('/api/ai/v4/request/c1?tableName=users&threadId=thread-1');
		expect(await collect(stream!)).toHaveLength(4);
	});

	it('passes the abort signal and resolves null when aborted', async () => {
		const controller = new AbortController();
		fetchMock.mockImplementation((_url: string, init: RequestInit) => {
			expect(init.signal).toBe(controller.signal);
			return Promise.reject(new DOMException('aborted', 'AbortError'));
		});
		controller.abort();
		expect(await useAiStore().createThread('c1', 'users', 'hi', controller.signal)).toBeNull();
		expect(useNotificationsStore().snackbars).toEqual([]);
	});

	it('reports a server error and rejects with the notified ApiError', async () => {
		fetchMock.mockImplementation(async () => new Response(JSON.stringify({ message: 'AI is off' }), { status: 403 }));
		await expect(useAiStore().sendMessage('c1', 'users', 't', 'hi')).rejects.toMatchObject({
			name: 'ApiError',
			notified: true,
		});
		expect(useNotificationsStore().snackbars[0]?.message).toBe('AI is off');
	});

	it('isAiStreamChunk accepts only objects with a string type', () => {
		expect(isAiStreamChunk({ type: 'text', content: 'a' })).toBe(true);
		expect(isAiStreamChunk({ type: 1 })).toBe(false);
		expect(isAiStreamChunk(null)).toBe(false);
		expect(isAiStreamChunk('text')).toBe(false);
	});
});
