<script setup lang="ts">
/**
 * Port of record-view-fields/file (`FileRecordViewComponent`): a file column. Buffer blobs and long
 * strings (encoded contents) collapse to `Binary Data`; a short string (a filename) is shown as is.
 */
import { computed } from 'vue';
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import RecordViewValue from './RecordViewValue.vue';

const props = defineProps<RecordViewFieldProps & { value?: unknown }>();
defineEmits<ViewFieldEmits>();

const isBlob = computed(
	() => typeof props.value === 'object' && props.value !== null && 'type' in props.value && 'data' in props.value,
);

const displayText = computed(() => {
	if (isBlob.value) return 'Binary Data';
	if (typeof props.value === 'string' && props.value.length > 20) return 'Binary Data';
	return props.value ? String(props.value) : '—';
});
</script>

<template>
	<RecordViewValue>{{ displayText }}</RecordViewValue>
</template>
