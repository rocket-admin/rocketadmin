export function getClearedKey(key: string) {
    const comparator = getComparatorFormKey(key);
    return key.substring(3).slice(0, (-comparator.length - 2));
}

export function getComparatorFormKey(key: string) {
    const keySubstrings = key.split('__')
    if (keySubstrings.length > 2) {
      return keySubstrings[keySubstrings.length - 1];
    } else {
      return 'eq';
    }
}

export function getFilters(queryParams) {
    const filters = Object.keys(queryParams)
        .filter(key => key.startsWith('f__'))
        .reduce((paramsObj, key) => {
          const clearedKey = getClearedKey(key);
          paramsObj[clearedKey] = queryParams[key];
          return paramsObj;
        }, {});
    return filters;
}

export function getComparators(queryParams) {
    const comparators = Object.keys(queryParams)
      .filter(key => key.startsWith('f__'))
      .reduce((paramsObj, key) => {
        const comparator = getComparatorFormKey(key);
        const clearedKey = getClearedKey(key);
        paramsObj[clearedKey] = comparator;
        return paramsObj;
      }, {});
    return comparators;
}