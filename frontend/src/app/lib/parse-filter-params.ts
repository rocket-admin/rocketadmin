export function getFiltersFromUrl(queryParams) {
  let filters = {};
  for (const key in queryParams) {
    filters[key] = Object.values(queryParams[key])[0];
  }
  return filters;
}

export function getComparatorsFromUrl(queryParams) {
  let comparators = {};
  for (const key in queryParams) {
    comparators[key] = Object.keys(queryParams[key])[0];
  }
  return comparators;
}