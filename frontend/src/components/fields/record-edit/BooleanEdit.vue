<script setup lang="ts">
/**
 * Port of record-edit-fields/boolean (`BooleanEditComponent`): a Yes / No toggle.
 *
 * Any truthy value reads as Yes; `0`, `''` and `false` as No; anything else (null/undefined) as
 * unset. The normalized value is emitted once on mount, as Angular did in `ngOnInit`. For a
 * nullable column (`allow_null` on the column or in the widget params) clicking the pressed option
 * again clears it back to `null`.
 */
import { computed, onMounted, ref } from 'vue';
import { type SelectOption, UiSegmented } from '@/components/ui';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

// `string` before `boolean`, and `value: undefined` as the default: otherwise Vue's boolean-prop
// casting turns `''` into `true` and a missing value into `false`.
const props = withDefaults(defineProps<RecordEditFieldProps & { value?: string | number | boolean | null }>(), {
	value: undefined,
});
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel, widgetParams } = useRecordEditField(props);

const OPTIONS: SelectOption<boolean>[] = [
	{ value: true, label: 'Yes' },
	{ value: false, label: 'No' },
];

const current = ref<boolean | null>(normalize(props.value));

/** Angular's `isRadiogroup`: the column may hold null, so a second click un-sets the value. */
const isRadiogroup = computed(() => Boolean(props.structure?.allow_null || widgetParams.value.allow_null));

onMounted(() => emit('fieldChange', current.value));

function onChange(option: boolean) {
	current.value = option;
	emit('fieldChange', option);
}

/**
 * A click on the already-pressed segment — the radio's `change` doesn't fire for it. By the time
 * the click reaches us the browser has already checked the radio, so compare with `current`.
 */
function onClick(event: MouseEvent) {
	if (!isRadiogroup.value || props.disabled || props.readonly) return;
	// A click on the visible segment is re-dispatched to its radio; handle that one only.
	const input = event.target;
	if (!(input instanceof HTMLInputElement)) return;
	const option = OPTIONS[Number(input.value)];
	if (option && option.value === current.value) {
		current.value = null;
		emit('fieldChange', null);
	}
}

function normalize(value: unknown): boolean | null {
	if (value) return true;
	if (value === 0 || value === '' || value === false) return false;
	return null;
}
</script>

<template>
	<div class="boolean-edit">
		<span class="boolean-edit__label">{{ normalizedLabel }}<span v-if="required" class="boolean-edit__required" aria-hidden="true"> *</span></span>
		<UiSegmented
			:model-value="current"
			:options="OPTIONS"
			:label="normalizedLabel || 'Value'"
			:disabled="disabled || readonly"
			:data-testid="`record-${label}-boolean-radio-group`"
			@update:model-value="onChange"
			@click.capture="onClick"
		/>
	</div>
</template>

<style scoped>
.boolean-edit {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.boolean-edit__label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-ink-soft);
}

.boolean-edit__required {
  color: var(--color-danger-strong);
}
</style>
