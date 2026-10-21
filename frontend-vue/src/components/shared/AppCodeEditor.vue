<script setup lang="ts">
/**
 * Monaco editor — the `<ngs-code-editor>` replacement used by the code, JSON and markdown fields
 * (and later the SQL / Cedar editors).
 *
 * Monaco is loaded on mount through `loadMonaco()`, so it stays in its own chunk and never loads for
 * a page without an editor. Until it resolves, and in jsdom where it never mounts, a plain
 * `<textarea>` stands in with the same value, so the value stays editable and tests can drive it.
 *
 * `modelValue` is read on mount and again whenever it changes from outside; edits emit
 * `update:modelValue`. The theme follows the user's dark-mode preference like the Angular editors.
 */
import type * as Monaco from 'monaco-editor';
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { loadMonaco } from '@/lib/monaco';
import { useUiSettingsStore } from '@/stores/ui-settings';

const props = withDefaults(
	defineProps<{
		modelValue?: string | null;
		/** Monaco language id: `json`, `sql`, `markdown`, `html`, `javascript`, … */
		language?: string;
		readonly?: boolean;
		/** Accessible name for the editor's text area. */
		label: string;
		/** Editor height. A CSS length; the editor does not grow with content. */
		height?: string;
		/** Extra Monaco options, merged over the defaults (no minimap, word wrap, no scroll past end). */
		options?: Monaco.editor.IStandaloneEditorConstructionOptions;
	}>(),
	{ language: 'plaintext', readonly: false, height: '200px' },
);

const emit = defineEmits<{ 'update:modelValue': [string] }>();

const host = ref<HTMLElement | null>(null);
const editor = shallowRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
const ready = ref(false);
const uiSettings = useUiSettingsStore();
let disposed = false;

onMounted(async () => {
	let monaco: typeof Monaco;
	try {
		monaco = await loadMonaco();
	} catch {
		return;
	}
	if (disposed || !host.value) return;
	editor.value = monaco.editor.create(host.value, {
		value: props.modelValue ?? '',
		language: props.language,
		readOnly: props.readonly,
		theme: uiSettings.isDarkMode ? 'vs-dark' : 'vs',
		minimap: { enabled: false },
		automaticLayout: true,
		scrollBeyondLastLine: false,
		wordWrap: 'on',
		ariaLabel: props.label,
		...props.options,
	});
	editor.value.onDidChangeModelContent(() => {
		emit('update:modelValue', editor.value?.getValue() ?? '');
	});
	ready.value = true;
});

onBeforeUnmount(() => {
	disposed = true;
	editor.value?.dispose();
});

watch(
	() => props.modelValue,
	(value) => {
		const instance = editor.value;
		if (instance && (value ?? '') !== instance.getValue()) instance.setValue(value ?? '');
	},
);

watch(
	() => props.readonly,
	(readOnly) => editor.value?.updateOptions({ readOnly }),
);

watch(
	() => props.language,
	async (language) => {
		const model = editor.value?.getModel();
		if (!model) return;
		const monaco = await loadMonaco();
		monaco.editor.setModelLanguage(model, language);
	},
);

function onFallbackInput(event: Event) {
	emit('update:modelValue', (event.target as HTMLTextAreaElement).value);
}
</script>

<template>
	<div class="app-code-editor ph-no-capture" :style="{ height }">
		<div v-show="ready" ref="host" class="app-code-editor__host" />
		<textarea
			v-if="!ready"
			class="app-code-editor__fallback"
			:aria-label="label"
			:value="modelValue ?? ''"
			:readonly="readonly"
			spellcheck="false"
			@input="onFallbackInput"
		/>
	</div>
</template>

<style scoped>
.app-code-editor {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: var(--color-surface);
}

.app-code-editor__host {
  width: 100%;
  height: 100%;
}

.app-code-editor__fallback {
  width: 100%;
  height: 100%;
  padding: var(--space-2) var(--space-3);
  border: 0;
  outline: none;
  resize: none;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-ink);
  background: transparent;
}
</style>
