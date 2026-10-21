<script setup lang="ts">
/**
 * Port of record-edit-fields/language (`LanguageEditComponent`): an ISO 639-1 language code picked
 * from an autocomplete of language names (matching on name, native name or code). Picking emits
 * the code; typing alone emits nothing. A nullable column (or `widget_params.allow_null`) gets an
 * empty option that emits `null`. `widget_params.show_flag: false` hides the flag emoji.
 */
import { computed, ref } from 'vue';
import { type AutocompleteOption, UiAutocomplete, UiField } from '@/components/ui';
import { getLanguageFlag, LANGUAGES } from '@/consts/languages';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

interface LanguageOption {
	value: string | null;
	label: string;
	flag: string;
	nativeName?: string;
}

const props = defineProps<RecordEditFieldProps & { value?: string | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel, widgetParams } = useRecordEditField(props);

const showFlag = computed<boolean>(() =>
	widgetParams.value.show_flag !== undefined ? Boolean(widgetParams.value.show_flag) : true,
);

const languages = computed<LanguageOption[]>(() => {
	const sorted = LANGUAGES.map((language) => ({
		value: language.code,
		label: language.name,
		flag: getLanguageFlag(language),
		nativeName: language.nativeName,
	})).sort((a, b) => a.label.localeCompare(b.label));
	const allowNull = widgetParams.value.allow_null || props.structure?.allow_null;
	return allowNull ? [{ value: null, label: '', flag: '' }, ...sorted] : sorted;
});

/** The picked language — Angular's control holding an object rather than typed text. */
const selected = ref<LanguageOption | null>(findLanguage(props.value));
const text = ref(selected.value?.label ?? '');

const options = computed<AutocompleteOption<LanguageOption>[]>(() => {
	const query = text.value.toLowerCase();
	return languages.value
		.filter(
			(language) =>
				language.label.toLowerCase().includes(query) ||
				language.value?.toLowerCase().includes(query) ||
				language.nativeName?.toLowerCase().includes(query),
		)
		.map((language) => ({ value: language, label: language.label }));
});

function onInput(value: string) {
	text.value = value;
	selected.value = null;
}

function onSelect(option: AutocompleteOption<LanguageOption>) {
	selected.value = option.value;
	text.value = option.label;
	emit('fieldChange', option.value.value);
}

/** Case-insensitive, as Angular matched the initial value. */
function findLanguage(code: string | null | undefined): LanguageOption | null {
	if (!code) return null;
	const lower = code.toLowerCase();
	return languages.value.find((language) => language.value?.toLowerCase() === lower) ?? null;
}
</script>

<template>
	<UiField class="language-edit" :label="normalizedLabel" :required="required">
		<UiAutocomplete
			:model-value="text"
			:options="options"
			:disabled="disabled"
			:readonly="readonly"
			:data-testid="`record-${label}-language`"
			@update:model-value="onInput"
			@select="onSelect"
		>
			<template v-if="showFlag && selected?.flag" #leading>
				<span class="language-edit__flag-prefix" aria-hidden="true">{{ selected.flag }}</span>
			</template>
			<template #option="{ option }">
				<span v-if="showFlag && option.value.flag" class="language-edit__flag" aria-hidden="true">{{ option.value.flag }}</span>
				<span class="language-edit__name">{{ option.label || '—' }}</span>
				<span
					v-if="option.value.nativeName && option.value.nativeName !== option.label"
					class="language-edit__native"
				>{{ option.value.nativeName }}</span>
				<span v-if="option.value.value" class="language-edit__code">({{ option.value.value }})</span>
			</template>
		</UiAutocomplete>
	</UiField>
</template>

<style scoped>
.language-edit__flag-prefix {
  font-size: var(--text-md);
  line-height: 1;
}

.language-edit__flag {
  font-size: var(--text-base);
}

.language-edit__name {
  flex: 1;
}

.language-edit__native {
  font-size: var(--text-xs);
  font-style: italic;
  color: var(--color-muted);
}

.language-edit__code {
  font-size: var(--text-2xs);
  color: var(--color-muted);
}
</style>
