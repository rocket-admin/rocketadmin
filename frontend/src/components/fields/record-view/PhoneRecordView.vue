<script setup lang="ts">
/**
 * Port of record-view-fields/phone (`PhoneRecordViewComponent`): a `tel:` link, formatted
 * internationally with the country's flag when `libphonenumber-js` recognises the number, as
 * stored otherwise. Nothing is rendered for an empty value.
 */
import { parsePhoneNumber } from 'libphonenumber-js';
import { computed } from 'vue';
import { COUNTRIES, getCountryFlag } from '@/consts/countries';
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import RecordViewValue from './RecordViewValue.vue';

const props = defineProps<RecordViewFieldProps & { value?: string | null }>();
defineEmits<ViewFieldEmits>();

const parsed = computed(() => {
	const value = props.value;
	if (!value || typeof value !== 'string') return { countryFlag: '', countryName: '', formattedNumber: '' };
	try {
		const phoneNumber = parsePhoneNumber(value);
		const country = phoneNumber?.country ? COUNTRIES.find((c) => c.code === phoneNumber.country) : undefined;
		if (country) {
			return {
				countryFlag: getCountryFlag(country.code),
				countryName: country.name,
				formattedNumber: phoneNumber.formatInternational(),
			};
		}
	} catch {
		// Not a parseable number: shown as stored.
	}
	return { countryFlag: '', countryName: '', formattedNumber: value };
});

const countryFlag = computed(() => parsed.value.countryFlag);
const countryName = computed(() => parsed.value.countryName);
const formattedNumber = computed(() => parsed.value.formattedNumber);
</script>

<template>
	<span v-if="value" class="phone-record-view">
		<span v-if="countryFlag" class="phone-record-view__flag" role="img" :aria-label="countryName" :title="countryName">{{
			countryFlag
		}}</span>
		<RecordViewValue tag="a" class="phone-record-view__link" :href="`tel:${value}`">{{
			formattedNumber || value
		}}</RecordViewValue>
	</span>
</template>

<style scoped>
.phone-record-view {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.phone-record-view__flag {
  font-size: var(--text-base);
  cursor: help;
  user-select: none;
}

.phone-record-view__link {
  color: var(--color-accent);
}
</style>
