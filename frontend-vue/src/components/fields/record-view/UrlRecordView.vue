<script setup lang="ts">
/**
 * Port of record-view-fields/url (`UrlRecordViewComponent`): a valid absolute URL becomes a link
 * opening in a new tab (the click does not bubble to the row); anything else is plain text.
 */
import { computed } from 'vue';
import { UiIcon } from '@/components/ui';
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';

const props = defineProps<RecordViewFieldProps & { value?: string | null }>();
defineEmits<ViewFieldEmits>();

const isValidUrl = computed(() => {
	if (!props.value) return false;
	try {
		new URL(props.value);
		return true;
	} catch {
		return false;
	}
});
</script>

<template>
	<a
		v-if="isValidUrl && value"
		:href="value"
		target="_blank"
		rel="noopener noreferrer"
		class="url-record-view__link"
		@click.stop
	>
		<UiIcon class="url-record-view__icon" name="link" size="sm" />
		{{ value }}
	</a>
	<span v-else>{{ value || '—' }}</span>
</template>

<style scoped>
.url-record-view__link {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-accent);
  word-break: break-all;
}

.url-record-view__icon {
  flex-shrink: 0;
}
</style>
