<script setup lang="ts">
// Port of frontend/src/app/components/ui-components/breadcrumbs (BreadcrumbsComponent).
//
// Crumbs with a `link` are RouterLinks (carrying `queryParams`); the rest — normally the last, the
// current page — are bold static text. A chevron separates them. Rendered as a `<nav>` with an
// ordered list and `aria-current="page"` on the final crumb, which the Angular `<div>` lacked.
import { UiIcon } from '@/components/ui';

export interface Breadcrumb {
	label: string;
	link?: string | null;
	queryParams?: Record<string, string>;
}

withDefaults(
	defineProps<{
		/** The trail, outermost first. */
		crumbs?: Breadcrumb[];
	}>(),
	{ crumbs: () => [] },
);
</script>

<template>
	<nav class="app-breadcrumbs" aria-label="Breadcrumb">
		<ol class="app-breadcrumbs__list">
			<li v-for="(crumb, index) in crumbs" :key="`${index}-${crumb.label}`" class="app-breadcrumbs__item">
				<RouterLink
					v-if="crumb.link"
					:to="{ path: crumb.link, query: crumb.queryParams }"
					class="app-breadcrumbs__link"
					:aria-current="index === crumbs.length - 1 ? 'page' : undefined"
				>
					{{ crumb.label }}
				</RouterLink>
				<strong
					v-else
					class="app-breadcrumbs__current"
					:aria-current="index === crumbs.length - 1 ? 'page' : undefined"
				>
					{{ crumb.label }}
				</strong>
				<UiIcon v-if="index !== crumbs.length - 1" name="chevron_right" size="sm" class="app-breadcrumbs__divider" />
			</li>
		</ol>
	</nav>
</template>

<style scoped>
.app-breadcrumbs__list {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--space-1);
	margin: 0;
	padding: 0;
	list-style: none;
}

.app-breadcrumbs__item {
	display: inline-flex;
	align-items: center;
	gap: var(--space-1);
	min-width: 0;
}

.app-breadcrumbs__link {
	padding: var(--space-1) var(--space-2);
	border-radius: var(--radius-control);
	color: var(--color-muted);
	font-weight: var(--weight-medium);
	text-decoration: none;
	transition:
		background var(--motion-fast),
		color var(--motion-fast);
}

.app-breadcrumbs__link:hover {
	background: var(--color-paper-2);
	color: var(--color-accent-ink);
}

.app-breadcrumbs__current {
	padding: var(--space-1) var(--space-2);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
	overflow-wrap: anywhere;
}

.app-breadcrumbs__divider {
	color: var(--color-muted-soft);
}
</style>
