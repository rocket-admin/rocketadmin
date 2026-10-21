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
