<script setup lang="ts">
/**
 * Port of record-edit-fields/point (`PointEditComponent`): a geometric `point` column (`{ x, y }`)
 * as two number inputs. Nothing renders until the row has a point.
 *
 * Angular bound the inputs to `value().x` / `.y`, mutating the row's object in place without an
 * `onFieldChange`; here each edit emits a new `{ ...point, x|y }` instead.
 */
import { ref } from 'vue';
import { UiField, UiInput } from '@/components/ui';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

interface Point {
	x: number | null;
	y: number | null;
}

const props = defineProps<RecordEditFieldProps & { value?: Point | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel } = useRecordEditField(props);

const point = ref<Point | null>(props.value ? { ...props.value } : null);

function onInput(axis: 'x' | 'y', value: string) {
	if (!point.value) return;
	point.value = { ...point.value, [axis]: value === '' ? null : parseFloat(value) };
	emit('fieldChange', point.value);
}
</script>

<template>
	<div v-if="point" class="point-edit">
		<UiField
			v-for="axis in ['x', 'y'] as const"
			:key="axis"
			class="point-edit__axis"
			:label="`${normalizedLabel} ${axis.toUpperCase()} coordinate`"
			:required="required"
		>
			<UiInput
				type="number"
				:name="`${label}-${fieldKey}-${axis}`"
				:model-value="point[axis]"
				:disabled="readonly"
				@update:model-value="onInput(axis, $event)"
			/>
		</UiField>
	</div>
</template>

<style scoped>
.point-edit {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.point-edit__axis {
  width: 48vw;
  min-width: 150px;
  max-width: 260px;
}
</style>
