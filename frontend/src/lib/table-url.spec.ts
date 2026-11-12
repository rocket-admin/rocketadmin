import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { routes } from '@/router/routes';
import { tablePagePath } from './table-url';

describe('tablePagePath', () => {
	it('builds the table page and its sub-pages', () => {
		expect(tablePagePath('c1', 'users')).toBe('/dashboard/c1/users');
		expect(tablePagePath('c1', 'users', 'entry')).toBe('/dashboard/c1/users/entry');
	});

	it.each(['a?b', 'a#b', '50%off', 'public.my table', 'a/b', 'таблица'])(
		'round-trips the table name %s through the router',
		(tableName) => {
			const router = createRouter({ history: createMemoryHistory(), routes });
			const route = router.resolve({ path: tablePagePath('c1', tableName, 'entry'), query: { id: '1' } });

			expect(route.name).toBe('row-edit');
			expect(route.params).toEqual({ connectionId: 'c1', tableName });
			expect(route.query).toEqual({ id: '1' });
		},
	);
});
