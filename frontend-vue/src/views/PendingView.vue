<script setup lang="ts">
// Placeholder for routes whose page is ported in Phase 3. Keeps the route table, guards and titles
// complete (and testable) before the pages exist.
import { useRoute } from 'vue-router';
import { UiCard, UiPageShell } from '@/components/ui';

const route = useRoute();
</script>

<template>
	<UiPageShell as="main">
		<UiCard as="section">
			<h1 class="pending__title">Not ported yet</h1>
			<p class="pending__text">
				The <code>{{ String(route.name) }}</code> page is part of the Vue migration (Phase 3) and is
				still served by the Angular app.
			</p>
		</UiCard>
	</UiPageShell>
</template>

<style scoped>
.pending__title {
	margin: 0 0 var(--space-2);
	font-size: var(--text-md);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

.pending__text {
	margin: 0;
	color: var(--color-muted);
}
</style>
