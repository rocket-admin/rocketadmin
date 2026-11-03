<script setup lang="ts">
/** Port of table-display-fields/url (`UrlDisplayComponent`): a link (`prefix` + value) opening in a new tab. */
import { computed } from 'vue';
import { UiIcon } from '@/components/ui';
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

const props = defineProps<TableDisplayFieldProps & { value?: string | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { widgetParams, copy } = useViewField(props, emit);

const hrefValue = computed(() => (props.value ? (widgetParams.value.prefix || '') + props.value : ''));

const isValidUrl = computed(() => {
	if (!props.value) return false;
	try {
		new URL(hrefValue.value);
		return true;
	} catch {
		return false;
	}
});
</script>

<template>
	<TableDisplayCell copy-label="Copy URL" @copy="copy(value)">
		<a
			v-if="isValidUrl"
			class="url-display__link"
			:href="hrefValue"
			target="_blank"
			rel="noopener noreferrer"
			@click.stop
		>
			<UiIcon class="url-display__icon" name="link" size="sm" />
			{{ value }}
		</a>
		<span v-else>{{ value || '—' }}</span>
	</TableDisplayCell>
</template>

<style scoped>
.url-display__link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  max-width: 100%;
  color: var(--color-accent);
}
</style>
