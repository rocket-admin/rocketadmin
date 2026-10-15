// jsdom does not implement ResizeObserver, which Vuetify layout components use.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub;
