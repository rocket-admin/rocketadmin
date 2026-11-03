<script setup lang="ts">
/**
 * Port of record-edit-fields/range (`RangeEditComponent`): a numeric column as a slider, bounded
 * by `widget_params.min` / `max` / `step` (defaults 0 / 100 / 1).
 */
import { computed, ref } from 'vue';
import { UiField } from '@/components/ui';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

const props = defineProps<RecordEditFieldProps & { value?: number | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel, widgetParams } = useRecordEditField(props);

const current = ref<number | null>(props.value ?? null);

const min = computed(() => numberParam('min', 0));
const max = computed(() => numberParam('max', 100));
const step = computed(() => numberParam('step', 1));

/** `value || min`, as Angular showed it: an empty (or zero) value sits at the minimum. */
const shown = computed(() => current.value || min.value);

function onInput(event: Event) {
	const value = +(event.target as HTMLInputElement).value;
	current.value = value;
	emit('fieldChange', value);
}

/** A set param that is not a non-zero number falls back to the default (`Number(x) || default`). */
function numberParam(name: 'min' | 'max' | 'step', fallback: number): number {
	const raw: unknown = widgetParams.value[name];
	return raw === undefined ? fallback : Number(raw) || fallback;
}
</script>

<template>
	<UiField v-slot="{ inputId, describedBy }" class="range-edit" :label="normalizedLabel" :required="required">
		<div class="range-edit__labels">
			<span>{{ min }}</span>
			<span class="range-edit__current">{{ shown }}</span>
			<span>{{ max }}</span>
		</div>
		<input
			:id="inputId"
			class="range-edit__input"
			type="range"
			:name="`${label}-${fieldKey}`"
			:min="min"
			:max="max"
			:step="step"
			:value="shown"
			:disabled="disabled || readonly"
			:aria-describedby="describedBy"
			:data-testid="`record-${label}-range`"
			@input="onInput"
		>
	</UiField>
</template>

<style scoped>
.range-edit {
  padding-bottom: var(--space-6);
}

.range-edit__labels {
  display: flex;
  justify-content: space-between;
  padding: 0 var(--space-05);
  font-size: var(--text-xs);
  color: var(--color-muted);
}

.range-edit__current {
  font-weight: var(--weight-semibold);
  color: var(--color-ink);
}

.range-edit__input {
  width: 100%;
  accent-color: var(--color-accent);
  cursor: pointer;
}

.range-edit__input:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.range-edit__input:focus-visible {
  outline: none;
  box-shadow: var(--ring-focus);
  border-radius: var(--radius-pill);
}
</style>
