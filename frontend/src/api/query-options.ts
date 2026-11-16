// Defaults that make a TanStack query behave like the Angular `httpResource` it replaces. They give
// one request per key change, no silent retries and no refetch on window focus. Each retry would
// show the error again.
export const resourceQueryDefaults = {
	retry: false,
	refetchOnWindowFocus: false,
} as const;
