// Defaults that make a TanStack query behave like the Angular `httpResource` it replaces: one
// request per key change, no silent retries (each retry would show the error again) and no refetch
// on window focus.
export const resourceQueryDefaults = {
	retry: false,
	refetchOnWindowFocus: false,
} as const;
