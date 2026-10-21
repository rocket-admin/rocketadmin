<script setup lang="ts">
/**
 * Port of record-view-fields/language (`LanguageRecordViewComponent`): a language code
 * (case-insensitive) as its name, with the flag emoji unless `show_flag: false`.
 */
import { computed } from 'vue';
import { getLanguageFlag, LANGUAGES } from '@/consts/languages';
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import RecordViewValue from './RecordViewValue.vue';

const props = defineProps<RecordViewFieldProps & { value?: string | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { widgetParams } = useViewField(props, emit);

const showFlag = computed(() => (widgetParams.value.show_flag !== undefined ? widgetParams.value.show_flag : true));

const language = computed(() => {
	const value = props.value;
	return value ? LANGUAGES.find((l) => l.code.toLowerCase() === value.toLowerCase()) : undefined;
});

const languageName = computed(() => {
	if (!props.value) return '—';
	return language.value ? language.value.name : props.value;
});

const languageFlag = computed(() => (language.value ? getLanguageFlag(language.value) : ''));
</script>

<template>
	<span class="language-record-view">
		<span v-if="showFlag && languageFlag" class="language-record-view__flag" aria-hidden="true">{{
			languageFlag
		}}</span>
		<RecordViewValue>{{ languageName }}</RecordViewValue>
	</span>
</template>

<style scoped>
.language-record-view__flag {
  margin-inline-end: var(--space-1);
  font-size: var(--text-md);
}
</style>
