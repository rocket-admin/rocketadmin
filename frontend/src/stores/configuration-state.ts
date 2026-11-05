// Port of ConfigurationStateService: runs the AI auto-configure setup stream for a connection
// (GET /ai/v2/setup/:id, NDJSON progress events) and replays the events through a paced queue so
// the progress log reads as a steady feed rather than arriving in bursts.
//
// `progress$` (BehaviorSubject) is now the `progress` ref; the set of connections being configured
// is reactive state, read through `isConfiguring(id)`.
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api, isApiError } from '@/api/client';
import { useNotificationsStore } from '@/stores/notifications';

export interface ConfigProgress {
	type: 'message' | 'complete' | 'error';
	text?: string;
	message?: string;
}

/** Normal pace of the progress log. */
export const DRAIN_INTERVAL_MS = 400;
/** Pace once the stream has completed, so the remaining log flushes quickly. */
export const DRAIN_INTERVAL_FAST_MS = 80;
/** Longest the log may keep replaying after the stream ends before the rest is flushed at once. */
export const DRAIN_CAP_AFTER_COMPLETE_MS = 1500;

export const useConfigurationStateStore = defineStore('configurationState', () => {
	const notifications = useNotificationsStore();
	const configuring = ref(new Set<string>());
	/** Latest progress event shown to the user (null when idle). */
	const progress = ref<ConfigProgress | null>(null);

	let queue: ConfigProgress[] = [];
	let drainTimer: ReturnType<typeof setInterval> | null = null;
	let drainIntervalMs = DRAIN_INTERVAL_MS;

	/** Starts the setup stream; resolves whether it completed. A second call for the same connection resolves false. */
	function startConfiguring(connectionId: string): Promise<boolean> {
		if (configuring.value.has(connectionId)) return Promise.resolve(false);
		configuring.value.add(connectionId);
		return runSetup(connectionId);
	}

	function isConfiguring(connectionId: string): boolean {
		return configuring.value.has(connectionId);
	}

	return { configuring, progress, startConfiguring, isConfiguring };

	async function runSetup(connectionId: string): Promise<boolean> {
		queue = [];
		stopDrain();
		drainIntervalMs = DRAIN_INTERVAL_MS;
		enqueue({ type: 'message', text: 'Starting configuration…' });
		try {
			// The connection being configured may not be the route's, so its master key is sent explicitly.
			const masterpwd = localStorage.getItem(`${connectionId}__masterKey`);
			const { stream } = await api
				.stream<ConfigProgress>(`/ai/v2/setup/${connectionId}`, undefined, {
					headers: masterpwd ? { masterpwd } : {},
					notify: false,
				})
				.catch((error: unknown) => {
					throw isApiError(error) ? new Error(`Setup failed with status ${error.status}`) : error;
				});

			for await (const event of stream) {
				if (event.type === 'complete') {
					// Keeps its place after the trailing messages, but the rest of the log speeds up.
					enqueue({ type: 'message', text: '✓ Setup complete' });
					enqueue(event);
					switchDrainSpeed(DRAIN_INTERVAL_FAST_MS);
					continue;
				}
				enqueue(event);
			}

			await waitForDrain();
			notifications.showSuccessSnackbar('All tables have been configured.');
			return true;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Configuration could not be completed.';
			queue = [];
			stopDrain();
			progress.value = { type: 'error', message };
			notifications.showErrorSnackbar(message);
			return false;
		} finally {
			configuring.value.delete(connectionId);
		}
	}

	function enqueue(event: ConfigProgress): void {
		queue.push(event);
		startDrain();
	}

	function startDrain(): void {
		if (drainTimer) return;
		// The first item shows at once; the rest are paced.
		drainOne();
		drainTimer = setInterval(drainOne, drainIntervalMs);
	}

	function switchDrainSpeed(intervalMs: number): void {
		drainIntervalMs = intervalMs;
		if (drainTimer) {
			clearInterval(drainTimer);
			drainTimer = setInterval(drainOne, intervalMs);
		}
	}

	function drainOne(): void {
		const next = queue.shift();
		if (!next) {
			stopDrain();
			return;
		}
		progress.value = next;
	}

	function stopDrain(): void {
		if (drainTimer) {
			clearInterval(drainTimer);
			drainTimer = null;
		}
	}

	function waitForDrain(): Promise<void> {
		switchDrainSpeed(DRAIN_INTERVAL_FAST_MS);
		const start = Date.now();
		return new Promise((resolve) => {
			const check = (): void => {
				if (queue.length === 0 && !drainTimer) {
					resolve();
					return;
				}
				if (Date.now() - start >= DRAIN_CAP_AFTER_COMPLETE_MS) {
					while (queue.length > 0) drainOne();
					stopDrain();
					resolve();
					return;
				}
				setTimeout(check, DRAIN_INTERVAL_FAST_MS);
			};
			check();
		});
	}
});
