// Test helper for stores that talk to the backend through `@/api/client`: stubs global fetch with a
// queue of canned responses and records each request, so specs exercise the real client (URL
// building, params, headers and error notifications) the way HttpTestingController did in Angular.
import { type Mock, vi } from 'vitest';

export interface RecordedRequest {
	url: string;
	method: string;
	headers: Headers;
	body: BodyInit | null | undefined;
	/** The request body parsed as JSON, when it was sent as JSON. */
	json: unknown;
}

export interface FetchMock {
	fn: Mock<typeof fetch>;
	requests: RecordedRequest[];
	/** The most recent request; throws when none was made. */
	last(): RecordedRequest;
}

export type MockResponder = Response | ((request: RecordedRequest) => Response | Promise<Response>);

export function jsonResponse(body: unknown, status = 200): Response {
	return new Response(body === undefined ? '' : JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

export function textResponse(body: string, status = 200): Response {
	return new Response(body, { status, headers: { 'Content-Type': 'text/plain' } });
}

/** Responses are consumed in order; once the queue is empty every request gets `{}`. */
export function mockFetch(...responders: MockResponder[]): FetchMock {
	const queue = [...responders];
	const requests: RecordedRequest[] = [];
	const fn = vi.fn((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const body = init?.body;
		let json: unknown;
		if (typeof body === 'string') {
			try {
				json = JSON.parse(body);
			} catch {
				json = undefined;
			}
		}
		const request: RecordedRequest = {
			url: String(input),
			method: init?.method ?? 'GET',
			headers: new Headers(init?.headers),
			body,
			json,
		};
		requests.push(request);
		const next = queue.shift();
		if (!next) return Promise.resolve(jsonResponse({}));
		return Promise.resolve(typeof next === 'function' ? next(request) : next);
	});
	vi.stubGlobal('fetch', fn);
	return {
		fn,
		requests,
		last() {
			const request = requests.at(-1);
			if (!request) throw new Error('No request was made');
			return request;
		},
	};
}

export const fakeError = {
	message: 'Connection error',
	originalMessage: 'Error details',
	statusCode: 400,
};
