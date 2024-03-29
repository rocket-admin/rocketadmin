import { getComparatorsFromUrl, getFiltersFromUrl } from './parse-filter-params';

const queryParams = {
    first_name: {
        contains: 'sh'
    },
    age: {
        gt: 25
    },
    city: {
        startswith: 'A'
    }
}

describe('Parse filter params', () => {
    it('should return filters from queryParams', () => {
        const filters = getFiltersFromUrl(queryParams);

        expect(filters).toEqual({
            first_name: 'sh',
            age: 25,
            city: 'A'
        });
    });

    it('should return comparators from queryParams', () => {
        const comparators = getComparatorsFromUrl(queryParams);

        expect(comparators).toEqual({
            first_name: 'contains',
            age: 'gt',
            city: 'startswith'
        });
    })
});