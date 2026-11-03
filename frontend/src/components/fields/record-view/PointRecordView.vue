<script setup lang="ts">
/**
 * Port of record-view-fields/point (`PointRecordViewComponent`): a geometric point — `"(x,y)"`,
 * `"x,y"`, `{ x, y }` or `[x, y]` — as `(x, y)`. Nothing is rendered for an empty value.
 */
import { computed } from 'vue';
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import RecordViewValue from './RecordViewValue.vue';

const props = defineProps<RecordViewFieldProps & { value?: unknown }>();
defineEmits<ViewFieldEmits>();

const formattedPoint = computed(() => {
	const value = props.value;
	if (!value) return '';
	if (typeof value === 'string') {
		const [x, y] = value
			.trim()
			.replace(/[()]/g, '')
			.split(',')
			.map((coord) => parseFloat(coord.trim()));
		return `(${x}, ${y})`;
	}
	if (typeof value === 'object') {
		const point = value as Record<string | number, unknown>;
		return `(${point.x || point[0]}, ${point.y || point[1]})`;
	}
	return '';
});
</script>

<template>
	<RecordViewValue v-if="formattedPoint" :title="formattedPoint">{{ formattedPoint }}</RecordViewValue>
</template>
