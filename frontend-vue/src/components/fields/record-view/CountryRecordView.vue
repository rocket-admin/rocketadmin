<script setup lang="ts">
/**
 * Port of record-view-fields/country (`CountryRecordViewComponent`): an ISO country code as its
 * name, with the flag emoji unless `show_flag: false`. Unknown codes are shown as stored.
 */
import { computed } from 'vue';
import { COUNTRIES, getCountryFlag } from '@/consts/countries';
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import RecordViewValue from './RecordViewValue.vue';

const props = defineProps<RecordViewFieldProps & { value?: string | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { widgetParams } = useViewField(props, emit);

const showFlag = computed(() => (widgetParams.value.show_flag !== undefined ? widgetParams.value.show_flag : true));

const countryName = computed(() => {
	if (!props.value) return '—';
	return COUNTRIES.find((c) => c.code === props.value)?.name ?? props.value;
});

const countryFlag = computed(() => (props.value ? getCountryFlag(props.value) : ''));
</script>

<template>
	<span class="country-record-view">
		<span v-if="showFlag && countryFlag" class="country-record-view__flag" aria-hidden="true">{{ countryFlag }}</span>
		<RecordViewValue>{{ countryName }}</RecordViewValue>
	</span>
</template>

<style scoped>
.country-record-view__flag {
  margin-inline-end: var(--space-1);
  font-size: var(--text-md);
}
</style>
