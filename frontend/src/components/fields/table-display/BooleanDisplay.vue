<script setup lang="ts">
/** Port of table-display-fields/boolean (`BooleanDisplayComponent`): a check / cross icon, optionally with inverted colours. */
import { computed } from 'vue';
import { UiIcon } from '@/components/ui';
import type { TableDisplayFieldProps } from '../types';
import { parseWidgetParams } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

// `value: undefined` turns off Vue's boolean casting, which would read an absent value as `false`
// (a cross) instead of the dash Angular showed.
const props = withDefaults(defineProps<TableDisplayFieldProps & { value?: boolean | null }>(), { value: undefined });

/** `invert_colors`: a `true` reads as bad (red) and a `false` as good (green). */
const invertColors = computed(() => parseWidgetParams(props.widgetStructure).invert_colors === true);

const tone = computed(() => {
	if (props.value === true) return invertColors.value ? 'negative' : 'positive';
	return invertColors.value ? 'positive' : 'negative';
});
</script>

<template>
	<TableDisplayCell :copyable="false">
		<UiIcon
			v-if="value === true || value === false"
			class="boolean-display__icon"
			:class="`boolean-display__icon--${tone}`"
			:name="value ? 'check' : 'close'"
			:label="value ? 'True' : 'False'"
		/>
		<span v-else>—</span>
	</TableDisplayCell>
</template>

<style scoped>
.boolean-display__icon {
  vertical-align: middle;
}

.boolean-display__icon--positive {
  color: var(--color-success);
}

.boolean-display__icon--negative {
  color: var(--color-danger);
}
</style>
