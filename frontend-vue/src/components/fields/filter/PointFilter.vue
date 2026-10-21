<script setup lang="ts">
/**
 * Port of filter-fields/point (`PointFilterComponent`): X and Y number inputs for a point column,
 * shown only when there is a value. `readonly` disables them, as in Angular.
 *
 * Angular mutated the bound `{ x, y }` object in place and never emitted; here each edit emits a
 * new `{ x, y }` through `fieldChange`. A `"(x, y)"` string value is parsed into one.
 */
import { computed, ref } from 'vue';
import { UiField, UiInput } from '@/components/ui';
import type { FilterFieldEmits, FilterFieldProps } from '../types';
import { useFilterField } from '../useFieldWidget';
import { type FocusTarget, useAutofocus } from './useAutofocus';

interface PointValue {
	x: number | null;
	y: number | null;
}

const props = defineProps<FilterFieldProps & { value?: PointValue | string | null }>();
const emit = defineEmits<FilterFieldEmits>();

const { normalizedLabel } = useFilterField(props);

const input = ref<FocusTarget>(null);
useAutofocus(props, input);

const point = ref<PointValue | null>(toPoint(props.value));
const hasValue = computed(() => Boolean(props.value) && point.value !== null);

function onInput(axis: 'x' | 'y', raw: string) {
	const next: PointValue = { x: point.value?.x ?? null, y: point.value?.y ?? null };
	next[axis] = raw === '' ? null : Number.parseFloat(raw);
	point.value = next;
	emit('fieldChange', next);
}

function toPoint(value: PointValue | string | null | undefined): PointValue | null {
	if (!value) return null;
	if (typeof value === 'object') return { x: value.x ?? null, y: value.y ?? null };
	const match = /^\(?\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)?$/.exec(value);
	if (!match) return { x: null, y: null };
	return { x: Number.parseFloat(match[1] ?? ''), y: Number.parseFloat(match[2] ?? '') };
}
</script>

<template>
	<div v-if="hasValue" class="point-filter">
		<UiField :label="`${normalizedLabel} X coordinate`" :required="required">
			<UiInput
				ref="input"
				type="number"
				:name="`${label}-${fieldKey}-x`"
				:model-value="point?.x ?? null"
				:disabled="readonly"
				@update:model-value="onInput('x', $event)"
			/>
		</UiField>
		<UiField :label="`${normalizedLabel} Y coordinate`" :required="required">
			<UiInput
				type="number"
				:name="`${label}-${fieldKey}-y`"
				:model-value="point?.y ?? null"
				:disabled="readonly"
				@update:model-value="onInput('y', $event)"
			/>
		</UiField>
	</div>
</template>

<style scoped>
.point-filter {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.point-filter > * {
  flex: 1 1 9.5rem;
  max-width: 16.25rem;
}
</style>
