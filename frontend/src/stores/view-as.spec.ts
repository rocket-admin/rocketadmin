import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { router } from '@/router';
import { useViewAsStore } from './view-as';

// A real router on memory history: the store reads its query and writes through its history.
vi.mock('@/router', async () => {
	const { createMemoryHistory, createRouter } = await import('vue-router');
	return {
		router: createRouter({
			history: createMemoryHistory(),
			routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
		}),
	};
});

/** The URL the history holds, which may differ from the router's route after a silent replace. */
function addressBar(): string {
	return router.options.history.location;
}

describe('view-as store', () => {
	let store: ReturnType<typeof useViewAsStore> | null = null;

	beforeEach(async () => {
		setActivePinia(createPinia());
		await router.push('/');
	});

	afterEach(() => {
		// Removes the store's afterEach hook from the shared router.
		store?.$dispose();
		store = null;
	});

	it('reads the initial group from the current URL', async () => {
		await router.push('/permissions/abc?viewAs=group-1');
		store = useViewAsStore();

		expect(store.viewAsGroupId).toBe('group-1');
		expect(store.isActive).toBe(true);
	});

	it('starts inactive without the param', () => {
		store = useViewAsStore();
		expect(store.viewAsGroupId).toBeNull();
		expect(store.isActive).toBe(false);
	});

	it('follows a navigation that brings a new group', async () => {
		store = useViewAsStore();
		await router.push('/dashboard/abc?viewAs=group-2');
		expect(store.viewAsGroupId).toBe('group-2');
	});

	it('puts the param back silently when a navigation drops it', async () => {
		await router.push('/permissions/abc?viewAs=group-1');
		store = useViewAsStore();

		await router.push('/dashboard/abc');

		expect(router.currentRoute.value.fullPath).toBe('/dashboard/abc');
		expect(addressBar()).toBe('/dashboard/abc?viewAs=group-1');
		expect(store.viewAsGroupId).toBe('group-1');
	});

	it('keeps the other query params when putting it back', async () => {
		await router.push('/?viewAs=group-1');
		store = useViewAsStore();

		await router.push('/dashboard/abc?page=2#top');

		expect(addressBar()).toBe('/dashboard/abc?page=2&viewAs=group-1#top');
	});

	it('leaves the URL alone when view-as is off', async () => {
		store = useViewAsStore();
		await router.push('/dashboard/abc');
		expect(addressBar()).toBe('/dashboard/abc');
	});

	it('clearViewAs drops the state and the param', async () => {
		await router.push('/permissions/abc?viewAs=group-1&tab=2');
		store = useViewAsStore();

		await store.clearViewAs();

		expect(store.viewAsGroupId).toBeNull();
		expect(router.currentRoute.value.fullPath).toBe('/permissions/abc?tab=2');
		expect(addressBar()).toBe('/permissions/abc?tab=2');
	});

	it('clearViewAs also drops a param that was put back silently', async () => {
		await router.push('/permissions/abc?viewAs=group-1');
		store = useViewAsStore();
		await router.push('/dashboard/abc');

		await store.clearViewAs();

		expect(store.isActive).toBe(false);
		expect(addressBar()).toBe('/dashboard/abc');
		await router.push('/users');
		expect(addressBar()).toBe('/users');
	});
});
