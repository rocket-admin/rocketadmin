// Replaces the `angulartics2On` / `angularticsAction` template directives:
//   const { trackEvent } = useAnalytics();
//   <UiButton @click="trackEvent('Connections: add connection is clicked')">
import amplitude from 'amplitude-js';

export function trackEvent(action: string, properties?: Record<string, unknown>): void {
	amplitude.getInstance().logEvent(action, properties);
}

export function useAnalytics() {
	return { trackEvent };
}
