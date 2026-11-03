import { vi } from 'vitest';

// jsdom implements no layout, so the observer APIs are missing and a component that creates one
// on mount would throw. The stubs never fire: jsdom reports every box as 0×0 anyway.
class NoopObserver {
	observe(): void {}
	unobserve(): void {}
	disconnect(): void {}
	takeRecords(): [] {
		return [];
	}
}

globalThis.ResizeObserver ??= NoopObserver as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver ??= NoopObserver as unknown as typeof IntersectionObserver;

// Monaco can't run in jsdom (no layout, no workers). Rejecting the loader leaves AppCodeEditor on
// its <textarea> fallback, which is what component tests drive.
vi.mock('@/lib/monaco', () => ({
	loadMonaco: () => Promise.reject(new Error('Monaco is not available in tests')),
	getMonacoWorker: () => {
		throw new Error('Monaco is not available in tests');
	},
}));
