<script setup lang="ts">
/**
 * Simple list of `UiListItem`s — the `mat-list` / `mat-nav-list` replacement.
 *
 * A real `<ul>`, so AT announces "list, 4 items". `as="nav"` wraps it in a `<nav>` landmark named by
 * `label`, for link lists that are navigation (the drawer's connection tabs); a list of row
 * summaries that merely *contain* links stays a plain list.
 */
import { computed } from 'vue';

const props = withDefaults(
	defineProps<{
		/** `nav` wraps the list in a `<nav>` landmark. */
		as?: 'ul' | 'nav';
		/** Accessible name — required in practice for `as="nav"`, since a page may hold several navs. */
		label?: string;
		/** Geometry only: row padding. */
		size?: 'sm' | 'md';
	}>(),
	{ as: 'ul', size: 'md' },
);

const classes = computed(() => ['ui-list', `ui-list--size-${props.size}`]);
</script>

<template>
	<nav v-if="as === 'nav'" :class="classes" :aria-label="label">
		<ul class="ui-list__items">
			<slot />
		</ul>
	</nav>
	<ul v-else :class="[...classes, 'ui-list__items']" :aria-label="label">
		<slot />
	</ul>
</template>

<style scoped>
.ui-list__items {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
