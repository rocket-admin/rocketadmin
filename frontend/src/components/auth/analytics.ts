// The auth pages reported every event to both Amplitude (angulartics2) and PostHog; this sends one
// event to both.
import posthog from 'posthog-js';
import { trackEvent } from '@/composables/useAnalytics';

export function trackAuthEvent(action: string, properties?: Record<string, unknown>): void {
	trackEvent(action, properties);
	posthog.capture(action, properties);
}
