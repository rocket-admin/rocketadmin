<script setup lang="ts">
/**
 * Port of record-view-fields/boolean (`BooleanRecordViewComponent`): a check (true) or a cross
 * (false), coloured success/danger — swapped by `invertColors` — and a dash for anything else.
 */
import { computed } from 'vue';
import { UiIcon } from '@/components/ui';
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';

// `value: undefined` turns off Vue's boolean casting, which would read an absent value as `false`
// (a cross) instead of the dash Angular showed.
const props = withDefaults(defineProps<RecordViewFieldProps & { value?: boolean | null }>(), { value: undefined });
const emit = defineEmits<ViewFieldEmits>();

const { widgetParams } = useViewField(props, emit);

const invertColors = computed(() => widgetParams.value.invertColors === true);

/** `true` → positive colour unless inverted; `false` → negative unless inverted. */
const toneClass = computed(() =>
	props.value === invertColors.value ? 'boolean-record-view--false' : 'boolean-record-view--true',
);
</script>

<template>
	<UiIcon
		v-if="value === true || value === false"
		:class="['boolean-record-view', toneClass]"
		:name="value ? 'check' : 'close'"
		:label="value ? 'Yes' : 'No'"
	/>
	<span v-else>—</span>
</template>

<style scoped>
.boolean-record-view--true {
  color: var(--color-success);
}

.boolean-record-view--false {
  color: var(--color-danger);
}
</style>
