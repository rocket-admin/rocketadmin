<script setup lang="ts">
/** Port of table-display-fields/image (`ImageDisplayComponent`): a thumbnail of an image URL (`prefix` + value, `height` px). */
import { computed } from 'vue';
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

const props = defineProps<TableDisplayFieldProps & { value?: string | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { widgetParams, copy } = useViewField(props, emit);

const srcValue = computed(() => (props.value ? (widgetParams.value.prefix || '') + props.value : ''));

const isUrl = computed(() => {
	if (!props.value) return false;
	try {
		new URL(srcValue.value);
		return true;
	} catch {
		return false;
	}
});

const thumbnailStyle = computed(() => {
	const height = widgetParams.value.height;
	return height ? { '--image-display-height': `${height}px` } : undefined;
});
</script>

<template>
	<TableDisplayCell copy-label="Copy image URL" @copy="copy(srcValue)">
		<img v-if="isUrl" class="image-display__thumbnail" :src="srcValue" alt="Image" :style="thumbnailStyle">
		<span v-else class="image-display__placeholder">[Image URL]</span>
	</TableDisplayCell>
</template>

<style scoped>
.image-display__thumbnail {
  display: block;
  height: var(--image-display-height, auto);
  margin: var(--space-3) 0;
}

.image-display__placeholder {
  font-style: italic;
  color: var(--color-muted);
}
</style>
