// The connection pages reported every event to both Amplitude (angulartics2) and PostHog; this sends
// one event to both. `posthogProperties` covers the few Angular call sites that sent Amplitude
// properties but none to PostHog.
import posthog from 'posthog-js';
import { trackEvent } from '@/composables/useAnalytics';

export function trackConnectionEvent(
	action: string,
	properties?: Record<string, unknown>,
	posthogProperties: Record<string, unknown> | undefined = properties,
): void {
	trackEvent(action, properties);
	posthog.capture(action, posthogProperties);
}
