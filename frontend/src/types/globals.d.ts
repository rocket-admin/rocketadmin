declare global {
	interface Window {
		Intercom?: (command: string, options?: Record<string, unknown>) => void;
		intercomSettings?: Record<string, unknown>;
		hj?: (command: string, userId: string | number, options?: Record<string, unknown>) => void;
	}
}

export {};
