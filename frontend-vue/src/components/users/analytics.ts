// The users-access dialogs reported their successes to both Amplitude (angulartics2) and PostHog;
// this sends one event to both.
import posthog from 'posthog-js';
import { trackEvent } from '@/composables/useAnalytics';

export function trackUsersEvent(action: string): void {
	trackEvent(action);
	posthog.capture(action);
}
