// Port of frontend/src/app/services/view-as.service.ts: "view as group" mode, where an admin sees the
// app through another group's Cedar policy. The group id lives in the `?viewAs=` query param so a
// deep link or a new tab opens in the same mode, and it sticks across navigations that drop it.
import { defineStore } from 'pinia';
import { computed, onScopeDispose, ref } from 'vue';
import { type LocationQuery, START_LOCATION } from 'vue-router';
import { router } from '@/router';

export const VIEW_AS_PARAM = 'viewAs';

export const useViewAsStore = defineStore('viewAs', () => {
	const viewAsGroupId = ref<string | null>(readInitial());
	const isActive = computed(() => !!viewAsGroupId.value);

	// Keep the state and the URL in sync after every navigation (Angular: NavigationEnd).
	const removeHook = router.afterEach((to, _from, failure) => {
		if (failure) return;
		const fromUrl = readParam(to.query);

		if (fromUrl) {
			if (fromUrl !== viewAsGroupId.value) viewAsGroupId.value = fromUrl;
			return;
		}

		if (viewAsGroupId.value) {
			// The navigation dropped the param but the mode persists: put it back into the URL without
			// another navigation (Angular: Location.replaceState).
			router.options.history.replace(appendParam(to.fullPath, VIEW_AS_PARAM, viewAsGroupId.value));
		}
	});
	onScopeDispose(removeHook);

	async function clearViewAs(): Promise<void> {
		viewAsGroupId.value = null;
		const current = router.currentRoute.value;
		if (!(VIEW_AS_PARAM in current.query)) {
			// The param was re-injected silently above, so the router never saw it; a navigation to the
			// same location would be dropped as a duplicate. Restore the router's own URL instead.
			router.options.history.replace(current.fullPath);
			return;
		}
		const { [VIEW_AS_PARAM]: _dropped, ...query } = current.query;
		await router.replace({ path: current.path, query, hash: current.hash });
	}

	return { viewAsGroupId, isActive, clearViewAs };
});

/** Before the first navigation resolves the router has no query yet, so fall back to the address bar. */
function readInitial(): string | null {
	const current = router.currentRoute.value;
	if (current !== START_LOCATION) return readParam(current.query);
	return new URLSearchParams(window.location.search).get(VIEW_AS_PARAM);
}

function readParam(query: LocationQuery): string | null {
	const value = query[VIEW_AS_PARAM];
	const first = Array.isArray(value) ? value[0] : value;
	return first || null;
}

function appendParam(url: string, key: string, value: string): string {
	const [beforeHash = '', hash] = url.split('#');
	const [path = '', search = ''] = beforeHash.split('?');
	const params = new URLSearchParams(search);
	params.set(key, value);
	return `${path}?${params.toString()}${hash === undefined ? '' : `#${hash}`}`;
}
