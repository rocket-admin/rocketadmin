type FilterQueryParams = Record<string, Record<string, unknown>>;

export function getFiltersFromUrl(queryParams: FilterQueryParams) {
	const filters: Record<string, unknown> = {};
	for (const key in queryParams) {
		filters[key] = Object.values(queryParams[key] ?? {})[0];
	}
	return filters;
}

export function getComparatorsFromUrl(queryParams: FilterQueryParams) {
	const comparators: Record<string, string | undefined> = {};
	for (const key in queryParams) {
		comparators[key] = Object.keys(queryParams[key] ?? {})[0];
	}
	return comparators;
}
