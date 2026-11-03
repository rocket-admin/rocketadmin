import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AlertType } from '@/models/alert';
import { useNotificationsStore } from '@/stores/notifications';
import {
	ApiError,
	api,
	buildUrl,
	connectionIdFromPath,
	encodeParams,
	isApiRequest,
	normalizeUrl,
	readNdjson,
	setConnectionIdProvider,
} from './client';

vi.mock('@/environment', () => ({ environment: { apiRoot: '', saasURL: 'https://saas.example.com' } }));
vi.mock('@/config', () => ({ getConfig: () => ({ baseURL: '/api', saasURL: '' }) }));

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function lastFetch(fetchMock: ReturnType<typeof vi.fn>): { url: string; init: RequestInit } {
	const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
	return { url, init };
}

function ndjsonStream(chunks: string[]): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder();
	return new ReadableStream({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
			controller.close();
		},
	});
}

describe('api client', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		setActivePinia(createPinia());
		localStorage.clear();
		fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
		vi.stubGlobal('fetch', fetchMock);
		setConnectionIdProvider(() => null);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		document.cookie = 'autoadmin_gclid=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
	});

	describe('urls', () => {
		it('prefixes API paths with the base URL and /saas paths with the SaaS URL', () => {
			expect(normalizeUrl('/connections')).toBe('/api/connections');
			expect(normalizeUrl('/saas/user/google/login')).toBe('https://saas.example.com/saas/user/google/login');
			expect(normalizeUrl('https://s3.amazonaws.com/x')).toBe('https://s3.amazonaws.com/x');
			expect(normalizeUrl('/assets/config.json')).toBe('/assets/config.json');
		});

		it('encodes keys and values with encodeURIComponent', () => {
			expect(encodeParams({ 'f[name]': 'a b+c', page: 2, skip: undefined, none: null })).toBe(
				'f%5Bname%5D=a%20b%2Bc&page=2',
			);
			expect(buildUrl('/table/rows', { q: 'x&y' })).toBe('/api/table/rows?q=x%26y');
		});

		it('reads the connection id from /<page>/<connection-id> paths', () => {
			expect(connectionIdFromPath('/dashboard/abc123/users')).toBe('abc123');
			expect(connectionIdFromPath('/connections-list')).toBeNull();
		});

		it('treats only our own origins as API requests', () => {
			expect(isApiRequest('/api/x')).toBe(true);
			expect(isApiRequest('https://app.rocketadmin.com/api/x')).toBe(true);
			expect(isApiRequest('https://bucket.s3.amazonaws.com/x')).toBe(false);
		});
	});

	describe('requests', () => {
		it('sends credentials, JSON body and returns the parsed data', async () => {
			const data = await api.post('/user/login', { email: 'a@b.c' });

			const { url, init } = lastFetch(fetchMock);
			expect(url).toBe('/api/user/login');
			expect(init.method).toBe('POST');
			expect(init.credentials).toBe('include');
			expect(init.body).toBe('{"email":"a@b.c"}');
			expect((init.headers as Headers).get('Content-Type')).toBe('application/json');
			expect(data).toEqual({ ok: true });
		});

		it('adds the GCLID and masterpwd headers to API requests', async () => {
			document.cookie = 'autoadmin_gclid=gclid-1';
			localStorage.setItem('conn-1__masterKey', 'secret');
			setConnectionIdProvider(() => 'conn-1');

			await api.get('/table/rows');

			const headers = lastFetch(fetchMock).init.headers as Headers;
			expect(headers.get('GCLID')).toBe('gclid-1');
			expect(headers.get('masterpwd')).toBe('secret');
		});

		it('keeps credentials and headers away from third-party hosts', async () => {
			localStorage.setItem('conn-1__masterKey', 'secret');
			setConnectionIdProvider(() => 'conn-1');

			await api.put('https://bucket.s3.amazonaws.com/upload', new Blob(['x']));

			const { init } = lastFetch(fetchMock);
			expect(init.credentials).toBe('same-origin');
			expect((init.headers as Headers).get('masterpwd')).toBeNull();
			expect((init.headers as Headers).get('Content-Type')).toBeNull();
		});

		it('resolves empty bodies to null', async () => {
			fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
			await expect(api.delete('/connection/1')).resolves.toBeNull();
		});

		it('shows the success message', async () => {
			await api.get('/user/email/verify/request', { successMessage: 'Confirmation email has been sent.' });
			expect(useNotificationsStore().snackbars.map((snackbar) => snackbar.message)).toEqual([
				'Confirmation email has been sent.',
			]);
		});
	});

	describe('errors', () => {
		it('throws a notified ApiError and shows a snackbar without details', async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Nope' }, 400));

			const error = await api.get('/x').catch((caught: unknown) => caught);

			expect(error).toBeInstanceOf(ApiError);
			expect((error as ApiError).status).toBe(400);
			expect((error as ApiError).notified).toBe(true);
			expect(useNotificationsStore().snackbars[0]?.message).toBe('Nope');
			expect(useNotificationsStore().alert).toBeNull();
		});

		it('shows an alert when the server sends originalMessage details', async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Failed', originalMessage: 'ECONNREFUSED' }, 500));

			await expect(api.get('/x')).rejects.toBeInstanceOf(ApiError);

			const alert = useNotificationsStore().alert;
			expect(alert?.type).toBe(AlertType.Error);
			expect(alert?.message).toEqual({ abstract: 'Failed', details: 'ECONNREFUSED' });
			alert?.actions?.[0]?.action?.(alert.id);
			expect(useNotificationsStore().alert).toBeNull();
		});

		it('honours notify and errorMessage', async () => {
			fetchMock.mockResolvedValue(jsonResponse({ message: 'Server text' }, 400));

			await api.get('/x', { notify: 'alert', errorMessage: 'Custom' }).catch(() => {});
			expect(useNotificationsStore().alert?.message).toEqual({ abstract: 'Custom', details: '' });

			useNotificationsStore().dismissAlert();
			const error = await api.get('/x', { notify: false }).catch((caught: unknown) => caught);
			expect(useNotificationsStore().alert).toBeNull();
			expect((error as ApiError).notified).toBe(false);
		});

		it('clears the session and goes to /login on 401', async () => {
			localStorage.setItem('token_expiration', new Date(Date.now() + 60_000).toISOString());
			const location = { href: 'http://localhost/dashboard/1', origin: 'http://localhost', pathname: '/dashboard/1' };
			vi.stubGlobal('location', location);
			fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, 401));

			await expect(api.get('/connections')).rejects.toBeInstanceOf(ApiError);

			expect(localStorage.getItem('token_expiration')).toBeNull();
			expect(location.href).toBe('/login');
			expect(useNotificationsStore().snackbars).toEqual([]);
		});

		it('rethrows aborts without notifying', async () => {
			fetchMock.mockRejectedValueOnce(new DOMException('aborted', 'AbortError'));
			await expect(api.get('/x')).rejects.toMatchObject({ name: 'AbortError' });
			expect(useNotificationsStore().snackbars).toEqual([]);
		});
	});

	describe('ndjson', () => {
		it('yields one object per line across chunk boundaries and skips junk', async () => {
			const stream = ndjsonStream([
				'{"type":"text","con',
				'tent":"a"}\n\n',
				'not json\ndata: {"type":"thinking_reset"}\n',
				'{"type":"text","content":"b"}',
			]);

			const chunks = [];
			for await (const chunk of readNdjson(stream)) chunks.push(chunk);

			expect(chunks).toEqual([
				{ type: 'text', content: 'a' },
				{ type: 'thinking_reset' },
				{ type: 'text', content: 'b' },
			]);
		});

		it('streams a POST response', async () => {
			fetchMock.mockResolvedValueOnce(new Response(ndjsonStream(['{"n":1}\n{"n":2}\n']), { status: 200 }));

			const { stream } = await api.stream<{ n: number }>('/ai/v4/request/1', { q: 'hi' });
			const values = [];
			for await (const chunk of stream) values.push(chunk.n);

			expect(lastFetch(fetchMock).init.method).toBe('POST');
			expect(values).toEqual([1, 2]);
		});
	});
});
