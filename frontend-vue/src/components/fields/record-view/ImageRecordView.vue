<script setup lang="ts">
/**
 * Port of record-view-fields/image (`ImageRecordViewComponent`): the image at `prefix + value`
 * (`widget_params.prefix`) when that is a valid URL, an `[Image URL]` placeholder otherwise — and
 * the stored value underneath either way.
 */
import { computed } from 'vue';
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import RecordViewValue from './RecordViewValue.vue';

const props = defineProps<RecordViewFieldProps & { value?: string | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { widgetParams } = useViewField(props, emit);

const srcValue = computed(() => {
	if (!props.value) return '';
	return (widgetParams.value.prefix || '') + props.value;
});

const isUrl = computed(() => {
	if (!props.value) return false;
	try {
		new URL(srcValue.value);
		return true;
	} catch {
		return false;
	}
});
</script>

<template>
	<img v-if="isUrl" class="image-record-view__preview" :src="srcValue" alt="Image">
	<RecordViewValue v-else>[Image URL]</RecordViewValue>
	<RecordViewValue>{{ value || '—' }}</RecordViewValue>
</template>

<style scoped>
.image-record-view__preview {
  display: block;
  width: 100%;
  height: auto;
}
</style>
