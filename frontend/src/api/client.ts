// The one HTTP client. Ports token.interceptor.ts, url-params.interceptor.ts and api.service.ts:
// every store talks to the backend through `api.*` and never calls fetch itself.
import { getConfig } from '@/config';
import { environment } from '@/environment';
import { AlertActionType, AlertType } from '@/models/alert';
import { useNotificationsStore } from '@/stores/notifications';

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

/**
 * How a failed request is reported before the error is thrown.
 * - `auto`: an alert when the server sent `originalMessage` details, otherwise an error snackbar (api.service.ts)
 * - `alert`: always the dismissible page alert (most legacy HttpClient services)
 * - `snackbar`: always an error snackbar
 * - `false`: report nothing; the caller handles the error
 */
export type ErrorDisplay = 'auto' | 'alert' | 'snackbar' | false;

export interface RequestOptions {
	params?: QueryParams;
	headers?: Record<string, string>;
	body?: unknown;
	signal?: AbortSignal;
	responseType?: 'json' | 'text' | 'blob';
	/** Shown in a success snackbar when the request succeeds. */
	successMessage?: string;
	/** Replaces the server's message in the error notification. */
	errorMessage?: string;
	notify?: ErrorDisplay;
}

export interface ApiResponse<T> {
	data: T;
	headers: Headers;
	status: number;
}

export interface ServerErrorBody {
	message?: string;
	originalMessage?: string;
	[key: string]: unknown;
}

/**
 * Thrown for every failed request. `notified` is true once the user has seen the error, so the
 * global handlers in main.ts stay quiet; an awaited call that fails then behaves like the
 * `catchError(() => EMPTY)` the Angular services used: the code after it simply never runs.
 */
export class ApiError extends Error {
	notified = false;

	constructor(
		message: string,
		readonly status: number,
		readonly body: ServerErrorBody,
	) {
		super(message);
		this.name = 'ApiError';
	}

	/** Same shape the Angular code read from `HttpErrorResponse` (`err.error.message`). */
	get details(): string | undefined {
		return this.body.originalMessage;
	}
}

export function isApiError(error: unknown): error is ApiError {
	return error instanceof ApiError;
}

export function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === 'AbortError';
}

// `masterpwd` is keyed by the current connection. Angular read it from ConnectionsService; the
// connections store registers itself here, and the URL's `/<page>/<connection-id>` is the fallback.
let connectionIdProvider: () => string | null = () => connectionIdFromPath(location.pathname);

export function setConnectionIdProvider(provider: () => string | null): void {
	connectionIdProvider = provider;
}

export function connectionIdFromPath(pathname: string): string | null {
	const segments = pathname.split('/');
	return segments.length >= 3 && segments[2] ? decodeURIComponent(segments[2]) : null;
}

/** Port of TokenInterceptor.normalizeURL. */
export function normalizeUrl(url: string): string {
	if (url.startsWith('/assets')) return url;
	if (url.startsWith('/saas')) return `${environment.saasURL}${url}`;
	if (url.startsWith('http://') || url.startsWith('https://')) return url;
	return `${environment.apiRoot || getConfig().baseURL}${url}`;
}

/** Port of EncodeUrlParamsSafelyInterceptor: keys and values go through encodeURIComponent. */
export function encodeParams(params?: QueryParams): string {
	if (!params) return '';
	return Object.entries(params)
		.filter(([, value]) => value !== undefined && value !== null)
		.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
		.join('&');
}

export function buildUrl(url: string, params?: QueryParams): string {
	const normalized = normalizeUrl(url);
	const query = encodeParams(params);
	if (!query) return normalized;
	return `${normalized}${normalized.includes('?') ? '&' : '?'}${query}`;
}

/** Credentials and the GCLID/masterpwd headers only go to our own API, never to S3 or third parties. */
export function isApiRequest(fullUrl: string): boolean {
	const origin = new URL(fullUrl, location.origin).origin;
	return origin === location.origin || origin === 'https://app.rocketadmin.com';
}

function readCookie(name: string): string | null {
	const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
	return match ? decodeURIComponent(match[1] ?? '') : null;
}

function isRawBody(body: unknown): body is BodyInit {
	return (
		body instanceof FormData ||
		body instanceof Blob ||
		body instanceof ArrayBuffer ||
		body instanceof URLSearchParams ||
		typeof body === 'string'
	);
}

export function buildHeaders(fullUrl: string, options: RequestOptions = {}): Headers {
	const headers = new Headers();
	if (options.body !== undefined && !isRawBody(options.body)) {
		headers.set('Content-Type', 'application/json');
	}

	if (isApiRequest(fullUrl)) {
		const gclid = readCookie('autoadmin_gclid');
		if (gclid) headers.set('GCLID', gclid);

		const connectionId = connectionIdProvider();
		if (connectionId) {
			const masterKey = localStorage.getItem(`${connectionId}__masterKey`);
			if (masterKey) headers.set('masterpwd', masterKey);
		}
	}

	for (const [key, value] of Object.entries(options.headers ?? {})) headers.set(key, value);
	return headers;
}

/** A 401 means the session cookie is gone: drop the client-side expiry and start over at /login. */
function handleUnauthorized(): void {
	localStorage.removeItem('token_expiration');
	location.href = '/login';
}

export function reportError(error: unknown, options: Pick<RequestOptions, 'errorMessage' | 'notify'> = {}): void {
	const display = options.notify ?? 'auto';
	if (display === false) return;

	const body: ServerErrorBody = isApiError(error) ? error.body : {};
	const message =
		options.errorMessage || body.message || (error instanceof Error ? error.message : '') || 'Unknown error';
	const details = body.originalMessage;
	const notifications = useNotificationsStore();

	if (display === 'alert' || (display === 'auto' && details)) {
		notifications.showAlert(AlertType.Error, { abstract: message, details: details ?? '' }, [
			{ type: AlertActionType.Button, caption: 'Dismiss', action: () => notifications.dismissAlert() },
		]);
	} else {
		notifications.showErrorSnackbar(message);
	}
	if (isApiError(error)) error.notified = true;
}

async function send(method: string, url: string, options: RequestOptions): Promise<Response> {
	const fullUrl = buildUrl(url, options.params);
	const apiRequest = isApiRequest(fullUrl);
	let response: Response;
	try {
		response = await fetch(fullUrl, {
			method,
			headers: buildHeaders(fullUrl, options),
			body:
				options.body === undefined ? undefined : isRawBody(options.body) ? options.body : JSON.stringify(options.body),
			credentials: apiRequest ? 'include' : 'same-origin',
			signal: options.signal,
		});
	} catch (error) {
		if (isAbortError(error)) throw error;
		const networkError = new ApiError(error instanceof Error ? error.message : 'Network error', 0, {});
		reportError(networkError, options);
		throw networkError;
	}

	if (!response.ok) {
		if (response.status === 401 && apiRequest) handleUnauthorized();
		const body = (await response.json().catch(() => ({}))) as ServerErrorBody;
		const error = new ApiError(body.message || `HTTP ${response.status}`, response.status, body);
		if (response.status === 401 && apiRequest) error.notified = true;
		else reportError(error, options);
		throw error;
	}
	return response;
}

async function readBody<T>(response: Response, responseType: RequestOptions['responseType']): Promise<T> {
	if (responseType === 'text') return (await response.text()) as T;
	if (responseType === 'blob') return (await response.blob()) as T;
	// 204 No Content and empty bodies resolve to null rather than failing to parse.
	const text = await response.text();
	return (text ? JSON.parse(text) : null) as T;
}

export async function request<T>(method: string, url: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
	const response = await send(method, url, options);
	const data = await readBody<T>(response, options.responseType);
	if (options.successMessage) useNotificationsStore().showSuccessSnackbar(options.successMessage);
	return { data, headers: response.headers, status: response.status };
}

/**
 * Reads a newline-delimited JSON body (the AI chat and the auto-configure setup stream). Blank lines,
 * SSE `data:` prefixes, `[DONE]` and lines that fail to parse are skipped, like the Angular readers.
 */
export async function* readNdjson<T>(body: ReadableStream<Uint8Array>): AsyncGenerator<T> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	const parse = (line: string): T | undefined => {
		const payload = line.startsWith('data:') ? line.slice(5).trim() : line;
		if (!payload || payload === '[DONE]') return undefined;
		try {
			return JSON.parse(payload) as T;
		} catch {
			return undefined;
		}
	};
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				buffer += decoder.decode();
				const tail = parse(buffer.trim());
				if (tail !== undefined) yield tail;
				return;
			}
			buffer += decoder.decode(value, { stream: true });
			let newline = buffer.indexOf('\n');
			while (newline >= 0) {
				const parsed = parse(buffer.slice(0, newline).trim());
				buffer = buffer.slice(newline + 1);
				if (parsed !== undefined) yield parsed;
				newline = buffer.indexOf('\n');
			}
		}
	} finally {
		reader.releaseLock();
	}
}

export interface StreamResponse<T> {
	headers: Headers;
	stream: AsyncGenerator<T>;
}

async function stream<T>(method: string, url: string, options: RequestOptions = {}): Promise<StreamResponse<T>> {
	const response = await send(method, url, options);
	if (!response.body) throw new ApiError('Empty response stream', response.status, {});
	return { headers: response.headers, stream: readNdjson<T>(response.body) };
}

type BodylessOptions = Omit<RequestOptions, 'body'>;

export const api = {
	request,
	async get<T>(url: string, options?: BodylessOptions): Promise<T> {
		return (await request<T>('GET', url, options)).data;
	},
	async post<T>(url: string, body?: unknown, options?: BodylessOptions): Promise<T> {
		return (await request<T>('POST', url, { ...options, body })).data;
	},
	async put<T>(url: string, body?: unknown, options?: BodylessOptions): Promise<T> {
		return (await request<T>('PUT', url, { ...options, body })).data;
	},
	async patch<T>(url: string, body?: unknown, options?: BodylessOptions): Promise<T> {
		return (await request<T>('PATCH', url, { ...options, body })).data;
	},
	async delete<T>(url: string, options?: RequestOptions): Promise<T> {
		return (await request<T>('DELETE', url, options)).data;
	},
	/** NDJSON stream; resolves once the response headers arrive. */
	stream<T>(url: string, body?: unknown, options?: BodylessOptions): Promise<StreamResponse<T>> {
		return stream<T>(body === undefined ? 'GET' : 'POST', url, { ...options, body });
	},
};
