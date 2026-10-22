// The table browser reported each event to both Amplitude (angulartics2On) and PostHog
// (posthog.capture); this sends one event to both.
import posthog from 'posthog-js';
import { trackEvent } from '@/composables/useAnalytics';

export function track(action: string, properties?: Record<string, unknown>): void {
	trackEvent(action, properties);
	posthog.capture(action, properties);
}
