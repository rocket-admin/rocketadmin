<script setup lang="ts">
/** Port of table-display-fields/phone (`PhoneDisplayComponent`): an international `tel:` link with the country's flag. */
import { parsePhoneNumber } from 'libphonenumber-js';
import { computed } from 'vue';
import { COUNTRIES, getCountryFlag } from '@/consts/countries';
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

const props = defineProps<TableDisplayFieldProps & { value?: string | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { copy } = useViewField(props, emit);

const phone = computed(() => {
	const value = props.value;
	if (!value || typeof value !== 'string') return { countryFlag: '', countryName: '', formattedNumber: '' };
	try {
		const parsed = parsePhoneNumber(value);
		const country = parsed?.country ? COUNTRIES.find((c) => c.code === parsed.country) : undefined;
		if (country) {
			return {
				countryFlag: getCountryFlag(country.code),
				countryName: country.name,
				formattedNumber: parsed.formatInternational(),
			};
		}
	} catch {
		// Not a parseable number: show it as typed.
	}
	return { countryFlag: '', countryName: '', formattedNumber: value };
});
</script>

<template>
	<TableDisplayCell @copy="copy(value)">
		<span v-if="value" class="phone-display">
			<span v-if="phone.countryFlag" class="phone-display__flag" :title="phone.countryName">{{ phone.countryFlag }}</span>
			<a :href="`tel:${value}`" class="phone-display__link" @click.stop>{{ phone.formattedNumber || value }}</a>
		</span>
		<span v-else>—</span>
	</TableDisplayCell>
</template>

<style scoped>
.phone-display {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.phone-display__flag {
  cursor: help;
  user-select: none;
}

.phone-display__link {
  color: var(--color-accent);
  text-decoration: none;
}

.phone-display__link:hover {
  text-decoration: underline;
}
</style>
