<script setup lang="ts">
/** Port of table-display-fields/point (`PointDisplayComponent`): a geometric point as `(x, y)`. */
import { computed } from 'vue';
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

type PointObject = { x?: number; y?: number; 0?: number; 1?: number };

const props = defineProps<
	TableDisplayFieldProps & {
		/** `"(x,y)"` / `"x,y"`, `{ x, y }` or `[x, y]`. */
		value?: string | PointObject | number[] | null;
	}
>();
const emit = defineEmits<ViewFieldEmits>();

const { copy } = useViewField(props, emit);

const formattedPoint = computed(() => {
	const value = props.value;
	if (!value) return '';
	try {
		if (typeof value === 'string') {
			const [x, y] = value
				.trim()
				.replace(/[()]/g, '')
				.split(',')
				.map((coord) => parseFloat(coord.trim()));
			return `(${x}, ${y})`;
		}
		const point = value as PointObject;
		return `(${point.x || point[0]}, ${point.y || point[1]})`;
	} catch {
		return String(value);
	}
});
</script>

<template>
	<TableDisplayCell v-if="formattedPoint" copy-label="Copy to clipboard" @copy="copy(formattedPoint)">
		<span class="point-display__value" :title="formattedPoint">{{ formattedPoint }}</span>
	</TableDisplayCell>
</template>

<style scoped>
.point-display__value {
  font-family: var(--font-mono);
}
</style>
