import { HttpResourceOptions, HttpResourceRef, HttpResourceRequest, httpResource } from '@angular/common/http';
import { effect, Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { AlertActionType, AlertType } from '../models/alert';
import { NotificationsService } from './notifications.service';

export interface ApiRequestOptions {
	params?: Record<string, string | number | boolean>;
	headers?: Record<string, string>;
	successMessage?: string;
	errorMessage?: string;
	responseType?: 'json' | 'text';
	signal?: AbortSignal;
}

export interface ApiResponse<T> {
	data: T;
	headers: Headers;
	status: number;
}

@Injectable({
	providedIn: 'root',
})
export class ApiService {
	private _notifications = inject(NotificationsService);

	resource<T>(
		request: () => string | HttpResourceRequest | undefined,
		options?: HttpResourceOptions<T, unknown> & { errorMessage?: string },
	): HttpResourceRef<T | undefined> {
		const ref = httpResource<T>(request as () => HttpResourceRequest | undefined, options);

		effect(() => {
			const err = ref.error();
			if (err) {
				this._handleError(err, { errorMessage: options?.errorMessage });
			}
		});

		return ref;
	}

	async get<T>(url: string, options?: ApiRequestOptions): Promise<T | null> {
		const result = await this._fetchResponse<T>('GET', url, undefined, options);
		return result?.data ?? null;
	}

	async post<T>(url: string, body?: unknown, options?: ApiRequestOptions): Promise<T | null> {
		const result = await this._fetchResponse<T>('POST', url, body, options);
		return result?.data ?? null;
	}

	async postResponse<T>(url: string, body?: unknown, options?: ApiRequestOptions): Promise<ApiResponse<T> | null> {
		return this._fetchResponse<T>('POST', url, body, options);
	}

	async put<T>(url: string, body?: unknown, options?: ApiRequestOptions): Promise<T | null> {
		const result = await this._fetchResponse<T>('PUT', url, body, options);
		return result?.data ?? null;
	}

	async delete<T>(url: string, options?: ApiRequestOptions): Promise<T | null> {
		const result = await this._fetchResponse<T>('DELETE', url, undefined, options);
		return result?.data ?? null;
	}

	async postStream(
		url: string,
		body?: unknown,
		options?: ApiRequestOptions,
	): Promise<{ headers: Headers; stream: AsyncGenerator<string> } | null> {
		try {
			const fullUrl = this._buildUrl(url, options?.params);
			const headers = this._buildHeaders(options?.headers);

			const response = await fetch(fullUrl, {
				method: 'POST',
				headers,
				body: body !== undefined ? JSON.stringify(body) : undefined,
				credentials: 'include',
				signal: options?.signal,
			});

			if (!response.ok) {
				if (response.status === 401) {
					localStorage.removeItem('token_expiration');
					location.href = '/login';
					return null;
				}

				const errorBody = await response.json().catch(() => ({}));
				throw { error: errorBody, status: response.status };
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();

			async function* textStream(): AsyncGenerator<string> {
				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						yield decoder.decode(value, { stream: true });
					}
				} finally {
					reader.releaseLock();
				}
			}

			return { headers: response.headers, stream: textStream() };
		} catch (err: unknown) {
			if ((err as Error).name === 'AbortError') return null;
			this._handleError(err, options);
			return null;
		}
	}

	private async _fetchResponse<T>(
		method: string,
		url: string,
		body?: unknown,
		options?: ApiRequestOptions,
	): Promise<ApiResponse<T> | null> {
		try {
			const fullUrl = this._buildUrl(url, options?.params);
			const headers = this._buildHeaders(options?.headers);

			const response = await fetch(fullUrl, {
				method,
				headers,
				body: body !== undefined ? JSON.stringify(body) : undefined,
				credentials: 'include',
				signal: options?.signal,
			});

			if (!response.ok) {
				if (response.status === 401) {
					localStorage.removeItem('token_expiration');
					location.href = '/login';
					return null;
				}

				const errorBody = await response.json().catch(() => ({}));
				throw { error: errorBody, status: response.status };
			}

			const data =
				(options?.responseType ?? 'json') === 'text' ? ((await response.text()) as T) : ((await response.json()) as T);

			if (options?.successMessage) {
				this._notifications.showSuccessSnackbar(options.successMessage);
			}

			return { data, headers: response.headers, status: response.status };
		} catch (err: unknown) {
			if ((err as Error).name === 'AbortError') return null;
			this._handleError(err, options);
			return null;
		}
	}

	private _buildUrl(url: string, params?: Record<string, string | number | boolean>): string {
		const normalized = this._normalizeUrl(url);

		if (!params || Object.keys(params).length === 0) return normalized;

		const searchParams = new URLSearchParams();
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined && value !== null) {
				searchParams.set(key, String(value));
			}
		}

		return `${normalized}?${searchParams.toString()}`;
	}

	private _normalizeUrl(url: string): string {
		if (url.startsWith('http://') || url.startsWith('https://')) return url;
		if (url.startsWith('/saas')) return `${environment.saasURL || ''}${url}`;
		return `${environment.apiRoot || '/api'}${url}`;
	}

	private _buildHeaders(custom?: Record<string, string>): Record<string, string> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		const gclidMatch = document.cookie.match(/(?:^|;\s*)autoadmin_gclid=([^;]*)/);
		if (gclidMatch?.[1]) {
			headers['GCLID'] = gclidMatch[1];
		}

		const pathSegments = location.pathname.split('/');
		const connectionId = pathSegments.length >= 3 ? pathSegments[2] : null;
		if (connectionId) {
			const masterKey = localStorage.getItem(`${connectionId}__masterKey`);
			if (masterKey) {
				headers['masterpwd'] = masterKey;
			}
		}

		if (custom) {
			Object.assign(headers, custom);
		}

		return headers;
	}

	private _handleError(err: unknown, options?: { errorMessage?: string }): void {
		console.log(err);
		const error = err as { error?: { message?: string; originalMessage?: string }; message?: string };
		const message = options?.errorMessage || error?.error?.message || error?.message || 'Unknown error';
		const details = error?.error?.originalMessage;

		if (details) {
			this._notifications.showAlert(AlertType.Error, { abstract: message, details }, [
				{
					type: AlertActionType.Button,
					caption: 'Dismiss',
					action: () => this._notifications.dismissAlert(),
				},
			]);
		} else {
			this._notifications.showErrorSnackbar(message);
		}
	}
}
