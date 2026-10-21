<script setup lang="ts">
/** Port of table-display-fields/country (`CountryDisplayComponent`): an ISO code shown as flag + country name. */
import { computed } from 'vue';
import { COUNTRIES, getCountryFlag } from '@/consts/countries';
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

const props = defineProps<TableDisplayFieldProps & { value?: string | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { widgetParams, copy } = useViewField(props, emit);

const showFlag = computed<boolean>(() =>
	widgetParams.value.show_flag !== undefined ? widgetParams.value.show_flag : true,
);

const countryName = computed(() => {
	if (!props.value) return '—';
	return COUNTRIES.find((c) => c.code === props.value)?.name ?? props.value;
});

const countryFlag = computed(() => (props.value ? getCountryFlag(props.value) : ''));
</script>

<template>
	<TableDisplayCell @copy="copy(countryName)">
		<span v-if="showFlag && countryFlag" class="country-display__flag">{{ countryFlag }}</span>
		<span>{{ countryName }}</span>
	</TableDisplayCell>
</template>

<style scoped>
.country-display__flag {
  margin-inline-end: var(--space-1);
}
</style>
