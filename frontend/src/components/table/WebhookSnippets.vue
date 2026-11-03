<script setup lang="ts">
// The "verify requests" code samples of the actions page (URL webhook method): one tab per language,
// each a read-only editor with a copy button. The snippets embed the connection's signing key.
import { computed, ref } from 'vue';
import AppCodeEditor from '@/components/shared/AppCodeEditor.vue';
import { UiIconButton, UiTab, UiTabPanel, UiTabs } from '@/components/ui';
import { useNotify } from '@/composables/useNotify';
import { codeSnippets } from '@/consts/code-snippets';
import { copyToClipboard } from '@/lib/clipboard';

const props = defineProps<{
	/** The connection's signing key, written into every snippet. */
	signingKey: string | null;
}>();

const notify = useNotify();
const snippets = computed(() => Object.entries(codeSnippets(props.signingKey ?? '')));
const selected = ref(snippets.value[0]?.[0] ?? '');

async function copy(langName: string, snippet: string) {
	if (await copyToClipboard(snippet)) notify.success(`${langName} code snippet was copied to clipboard.`);
}
</script>

<template>
	<div class="webhook-snippets">
		<UiTabs v-model="selected" label="Code snippets">
			<template #tabs>
				<UiTab v-for="[key, lang] in snippets" :key="key" :value="key">{{ lang.langName }}</UiTab>
			</template>
			<UiTabPanel v-for="[key, lang] in snippets" :key="key" :value="key">
				<div class="webhook-snippets__panel">
					<UiIconButton
						icon="content_copy"
						label="Copy code"
						variant="secondary"
						size="sm"
						class="webhook-snippets__copy"
						@click="copy(lang.langName, lang.snippet)"
					/>
					<AppCodeEditor
						:model-value="lang.snippet"
						:language="lang.mode"
						:label="`${lang.langName} code snippet`"
						readonly
						height="18rem"
					/>
				</div>
			</UiTabPanel>
		</UiTabs>
	</div>
</template>

<style scoped>
.webhook-snippets {
	max-width: 68.75rem;
	padding: var(--space-2) var(--space-3);
	border: 1px solid var(--color-line);
	border-radius: var(--radius-card);
}

.webhook-snippets__panel {
	position: relative;
	margin-top: var(--space-2);
}

.webhook-snippets__copy {
	position: absolute;
	top: var(--space-2);
	right: var(--space-6);
	z-index: 1;
}
</style>
