<script setup lang="ts">
/** Port of table-display-fields/language (`LanguageDisplayComponent`): a language code shown as flag + name. */
import { computed } from 'vue';
import { getLanguageFlag, LANGUAGES } from '@/consts/languages';
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

const props = defineProps<TableDisplayFieldProps & { value?: string | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { widgetParams, copy } = useViewField(props, emit);

const showFlag = computed<boolean>(() =>
	widgetParams.value.show_flag !== undefined ? widgetParams.value.show_flag : true,
);

const language = computed(() => {
	const code = props.value?.toLowerCase();
	return code ? LANGUAGES.find((l) => l.code.toLowerCase() === code) : undefined;
});

const languageName = computed(() => (props.value ? (language.value?.name ?? props.value) : '—'));
const languageFlag = computed(() => (language.value ? getLanguageFlag(language.value) : ''));
</script>

<template>
	<TableDisplayCell @copy="copy(languageName)">
		<span v-if="showFlag && languageFlag" class="language-display__flag">{{ languageFlag }}</span>
		<span>{{ languageName }}</span>
	</TableDisplayCell>
</template>

<style scoped>
.language-display__flag {
  margin-inline-end: var(--space-1);
}
</style>
