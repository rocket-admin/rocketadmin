import { describe, expect, it } from 'vitest';
import {
	buildFilters,
	clearedFiltersQuery,
	filtersQuery,
	parseJsonUrl,
	parseTableQuery,
	searchQuery,
	sortPageQuery,
	toSortOrder,
} from './table-query';

describe('table-query', () => {
	it('reads the table state from the URL as the dashboard did', () => {
		const state = parseTableQuery({
			filters: '(age:(gt:20),name:(startswith:A))',
			page_index: '2',
			page_size: '100',
			sort_active: 'name',
			sort_direction: 'DESC',
			search: 'john',
			uncached: 'true',
			saved_filter: 'f1',
			dynamic_column: '(column_name:age,comparator:gt)',
		});
		expect(state).toEqual({
			filters: { age: { gt: 20 }, name: { startswith: 'A' } },
			comparators: { age: 'gt', name: 'startswith' },
			pageIndex: 2,
			pageSize: 100,
			sortActive: 'name',
			sortDirection: 'DESC',
			search: 'john',
			uncached: true,
			savedFilter: 'f1',
			dynamicColumn: '(column_name:age,comparator:gt)',
		});
	});

	it('defaults to the first page of 30 rows, unfiltered and unsorted', () => {
		expect(parseTableQuery({})).toMatchObject({
			filters: undefined,
			comparators: {},
			pageIndex: 0,
			pageSize: 30,
			sortActive: undefined,
			uncached: false,
		});
	});

	it('ignores malformed filters instead of throwing', () => {
		expect(parseJsonUrl('(a:(eq:x y))')).toBeUndefined();
	});

	it('writes sort and page changes with the filters and saved filter, direction uppercased', () => {
		expect(
			sortPageQuery({
				filters: { name: { eq: 'Ann' } },
				savedFilter: 'f1',
				dynamicColumn: undefined,
				sortActive: 'name',
				sortDirection: 'asc',
				pageIndex: 1,
				pageSize: 30,
			}),
		).toEqual({
			filters: '(name:(eq:Ann))',
			saved_filter: 'f1',
			sort_active: 'name',
			sort_direction: 'ASC',
			page_index: '1',
			page_size: '30',
		});
	});

	it('resets to the first page for filters, cleared filters and search', () => {
		expect(filtersQuery({ id: { eq: 5 } }, 100)).toEqual({ filters: '(id:(eq:5))', page_index: '0', page_size: '100' });
		expect(filtersQuery({}, 30)).toEqual({ filters: '()', page_index: '0', page_size: '30' });
		expect(clearedFiltersQuery(30)).toEqual({ page_index: '0', page_size: '30' });
		expect(searchQuery('kenny', 30)).toEqual({ page_index: '0', page_size: '30', search: 'kenny' });
		expect(searchQuery(null, 30)).toEqual({ page_index: '0', page_size: '30' });
	});

	it('builds URL filters from the dialog fields and comparators', () => {
		expect(buildFilters({ name: 'A', age: 20, email: undefined }, { name: 'startswith', age: 'gt' })).toEqual({
			name: { startswith: 'A' },
			age: { gt: 20 },
		});
		expect(buildFilters({ name: 'A' }, {})).toEqual({});
		expect(buildFilters({ name: undefined }, { name: 'eq' })).toBeNull();
	});

	it('maps any-case directions to the API sort order', () => {
		expect(toSortOrder('asc')).toBe('ASC');
		expect(toSortOrder('DESC')).toBe('DESC');
		expect(toSortOrder('')).toBeUndefined();
		expect(toSortOrder(undefined)).toBeUndefined();
	});
});
