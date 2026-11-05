<script setup lang="ts">
// Port of frontend/src/app/components/dashboards/panel-renderers/text-panel: the markdown stored in
// the saved query's `widget_options.text_content`.
import { computed } from 'vue';
import AppMarkdown from '@/components/shared/AppMarkdown.vue';
import type { DashboardWidget } from '@/models/dashboard';
import type { SavedQuery } from '@/models/saved-query';

const props = withDefaults(defineProps<{ widget: DashboardWidget; preloadedQuery?: SavedQuery | null }>(), {
	preloadedQuery: null,
});

const textContent = computed(() => (props.preloadedQuery?.widget_options?.text_content as string | undefined) || '');
</script>

<template>
	<div v-if="textContent" class="text-panel">
		<AppMarkdown :source="textContent" />
	</div>
	<div v-else class="text-panel text-panel--empty">
		<p>No content</p>
		<p class="text-panel__hint">Edit this panel to add text content.</p>
	</div>
</template>

<style scoped>
.text-panel {
	flex: 1;
	width: 100%;
	height: 100%;
	overflow: auto;
}

.text-panel--empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	color: var(--color-muted);
}

.text-panel--empty p {
	margin: 0;
}

.text-panel__hint {
	margin-top: var(--space-1);
	font-size: var(--text-xs);
}
</style>
