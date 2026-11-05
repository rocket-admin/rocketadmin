// Helpers shared by the secrets page and its dialogs: expiry checks, Angular's `date` pipe formats,
// the `<input type="date">` value conversions that replace mat-datepicker, and the analytics events
// (Angular sent each one to both Amplitude and PostHog).
import posthog from 'posthog-js';
import { trackEvent } from '@/composables/useAnalytics';
import type { Secret } from '@/models/secret';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function isExpired(secret: Secret): boolean {
	if (!secret.expiresAt) return false;
	return new Date(secret.expiresAt) < new Date();
}

/** Expires in the next seven days (and has not expired yet). */
export function isExpiringSoon(secret: Secret): boolean {
	if (!secret.expiresAt) return false;
	const expiresAt = new Date(secret.expiresAt);
	const now = new Date();
	return expiresAt > now && expiresAt <= new Date(now.getTime() + SEVEN_DAYS_MS);
}

const mediumDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const medium = new Intl.DateTimeFormat('en-US', {
	month: 'short',
	day: 'numeric',
	year: 'numeric',
	hour: 'numeric',
	minute: '2-digit',
	second: '2-digit',
});

/** Angular's `date:'mediumDate'`, e.g. "Jan 5, 2024". */
export function formatMediumDate(value: string): string {
	return mediumDate.format(new Date(value));
}

/** Angular's `date:'medium'`, e.g. "Jan 5, 2024, 3:04:05 PM". */
export function formatMediumDateTime(value: string): string {
	return medium.format(new Date(value));
}

function pad(value: number): string {
	return String(value).padStart(2, '0');
}

/** A date as the local `YYYY-MM-DD` value of an `<input type="date">`. */
export function toDateInputValue(date: Date): string {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The ISO timestamp of a `YYYY-MM-DD` date input value: local midnight, as the native date adapter
 * of mat-datepicker produced. Empty input gives undefined.
 */
export function dateInputToIso(value: string): string | undefined {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return undefined;
	return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toISOString();
}

export function trackSecretsEvent(action: string): void {
	trackEvent(action);
	posthog.capture(action);
}
