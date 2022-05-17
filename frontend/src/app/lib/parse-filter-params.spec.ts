import { getClearedKey, getComparatorFormKey, getFilters, getComparators} from './parse-filter-params';

const queryParams = {
    f__first_name__contains: 'sh',
    f__age__gt: 25,
    f__city__startswith: 'A',
    page_index: 0
}

describe('Normalize function', () => {
    it('should return comparator of filter', () => {
        const comparator = getComparatorFormKey('f__name__contains');

        expect(comparator).toEqual('contains');
    });

    it('should return defaul comparator of filter', () => {
        const comparator = getComparatorFormKey('f__name');

        expect(comparator).toEqual('eq');
    });

    it('should return key for filters object', () => {
        const key = getClearedKey('f__name__contains');

        expect(key).toEqual('name');
    });

    it('should return filters from queryParams', () => {
        const filters = getFilters(queryParams);

        expect(filters).toEqual({
            first_name: 'sh',
            age: 25,
            city: 'A'
        });
    });

    it('should return comparators from queryParams', () => {
        const comparators = getComparators(queryParams);

        expect(comparators).toEqual({
            first_name: 'contains',
            age: 'gt',
            city: 'startswith'
        });
    })
});