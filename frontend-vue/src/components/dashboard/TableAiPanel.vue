<script setup lang="ts">
/**
 * Port of db-table-view/db-table-ai-panel: the "AI insights" chat about the current table.
 *
 * - Empty chat: a question input with suggestion chips (Explore / Data Quality / Insights); a chip
 *   fills the input and opens its completions, hovering one previews it, picking one asks it.
 * - The first question creates a thread (POST /ai/v4/request, thread id from the response header),
 *   later ones continue it. Answers stream in as NDJSON (`useAiStore`): `thinking` text is shown
 *   until the first `text` chunk, `thinking_commit` promotes it to the answer.
 * - Answers render as Markdown with ```mermaid diagrams (AppMarkdown `mermaid`).
 * - Enter sends, Shift+Enter starts a new line. A request still running when the panel closes is
 *   aborted and recorded as "Request cancelled".
 *
 * Open/close state lives in the table-state store (`aiPanelOpen`); the close button toggles it.
 * The panel fills its container; the host decides where it sits (Angular pinned it fixed below the
 * header, across the content area).
 */
import posthog from 'posthog-js';
import { onBeforeUnmount, onMounted, onUpdated, ref, watch } from 'vue';
import { isApiError } from '@/api/client';
import AppMarkdown from '@/components/shared/AppMarkdown.vue';
import { UiIconButton, UiInput, UiTextarea } from '@/components/ui';
import { trackEvent } from '@/composables/useAnalytics';
import { type AiStreamChunk, useAiStore } from '@/stores/ai';
import { useConnectionsStore } from '@/stores/connections';
import { useTableStateStore } from '@/stores/table-state';
import { useTablesStore } from '@/stores/tables';
import {
	type AiChatMessage,
	type AiSuggestion,
	LOADING_STEPS,
	SUGGESTION_CATEGORIES,
	textareaRowsFor,
} from './TableAiPanel.helpers';

withDefaults(
	defineProps<{
		/** The table's display name. Unused by the Angular template, kept for the host's binding. */
		displayName?: string;
		/** The table's columns. Unused by the Angular template, kept for the host's binding. */
		tableColumns?: string[];
		/** Whether the app's table list sidebar is expanded (layout only). */
		sidebarExpanded?: boolean;
	}>(),
	{ displayName: '', tableColumns: () => [], sidebarExpanded: true },
);

// Served from ../frontend/src/assets until the cutover (see README); a bound src keeps Vite from bundling it.
const AI_ROCKET_URL = '/assets/icons/ai-rocket.svg';

const ai = useAiStore();
const connections = useConnectionsStore();
const tables = useTablesStore();
const tableState = useTableStateStore();

// Read once, as ngOnInit did: a thread belongs to the table it was started on.
const connectionID = connections.currentConnectionID ?? '';
const tableName = tables.currentTableName ?? '';

const message = ref('');
const charactrsNumber = ref(0);
const threadID = ref<string | null>(null);
const messagesChain = ref<AiChatMessage[]>([]);
const activeSuggestion = ref<AiSuggestion | null>(null);
const activeCompletions = ref<string[]>([]);
const showCompletions = ref(false);
const submitting = ref(false);
const isExpanded = ref(true);
const textareaRows = ref(textareaRowsFor(window.innerHeight));
const currentLoadingStep = ref('');
const chatContainer = ref<HTMLElement | null>(null);

let abortController: AbortController | null = null;
let loadingStepsInterval: ReturnType<typeof setInterval> | null = null;
let currentStepIndex = 0;

// aiPanelExpandedCast: every emission re-expanded the panel.
watch(
	() => tableState.aiPanelExpanded,
	() => {
		isExpanded.value = true;
	},
);

onMounted(() => {
	window.addEventListener('resize', onWindowResize);
	document.addEventListener('click', onDocumentClick);
	scrollToBottom();
});

// ngAfterViewChecked
onUpdated(() => scrollToBottom());

onBeforeUnmount(() => {
	window.removeEventListener('resize', onWindowResize);
	document.removeEventListener('click', onDocumentClick);
	cancelRequest();
	stopLoadingSteps();
	track('AI panel: destroyed', { messagesLength: messagesChain.value.length });
});

function cancelRequest() {
	if (!abortController) return;
	abortController.abort();
	abortController = null;
	submitting.value = false;
	stopLoadingSteps();
	messagesChain.value.push({ type: 'ai-error', text: 'Request cancelled' });
	track('AI panel: request cancelled');
}

function startLoadingSteps() {
	currentStepIndex = 0;
	currentLoadingStep.value = LOADING_STEPS[0] ?? '';
	loadingStepsInterval = setInterval(() => {
		currentStepIndex = (currentStepIndex + 1) % LOADING_STEPS.length;
		currentLoadingStep.value = LOADING_STEPS[currentStepIndex] ?? '';
	}, 2000);
}

function stopLoadingSteps() {
	if (loadingStepsInterval) {
		clearInterval(loadingStepsInterval);
		loadingStepsInterval = null;
	}
}

function onKeydown(event: KeyboardEvent) {
	charactrsNumber.value = message.value.length + 1;
	// Shift+Enter: the textarea's own newline.
	if (event.key !== 'Enter' || event.shiftKey) return;
	event.preventDefault();
	if (threadID.value) sendMessage();
	else createThread();
}

function submitChat() {
	if (threadID.value) sendMessage();
	else createThread();
}

async function createThread(suggestedMessage?: string) {
	const text = beginRequest(suggestedMessage);
	const controller = abortController;
	try {
		const response = await ai.createThread(connectionID, tableName, text, controller?.signal);
		if (response) {
			threadID.value = response.threadId;
			await consumeStream(response.stream);
			track('AI panel: thread created successfully');
		}
	} catch (error) {
		if (!isReportedApiError(error)) {
			messagesChain.value.push({ type: 'ai-error', text: String(error) });
			track('AI panel: thread creation returned an error');
		}
	} finally {
		endRequest(controller);
	}
}

async function sendMessage(suggestedMessage?: string) {
	const text = beginRequest(suggestedMessage);
	charactrsNumber.value = 0;
	const controller = abortController;
	try {
		const stream = await ai.sendMessage(connectionID, tableName, threadID.value ?? '', text, controller?.signal);
		if (stream) {
			await consumeStream(stream);
			track('AI panel: message sent successfully');
		}
	} catch (error) {
		if (!isReportedApiError(error)) {
			messagesChain.value.push({ type: 'ai-error', text: String(error) });
			track('AI panel: message sent and returned an error');
		}
	} finally {
		endRequest(controller);
	}
}

/** Shows the question, clears the input and starts a request; returns the question. */
function beginRequest(suggestedMessage?: string): string {
	if (suggestedMessage) message.value = suggestedMessage;
	submitting.value = true;
	startLoadingSteps();
	const text = message.value;
	messagesChain.value.push({ type: 'user', text });
	message.value = '';
	abortController = new AbortController();
	return text;
}

function endRequest(controller: AbortController | null) {
	// A cancelled request already reset the state (and maybe a new one started).
	if (abortController !== controller) return;
	submitting.value = false;
	stopLoadingSteps();
	abortController = null;
}

async function consumeStream(stream: AsyncGenerator<AiStreamChunk>) {
	messagesChain.value.push({ type: 'ai', text: '', thinking: '' });
	// The reactive proxy of the message just pushed, so each chunk re-renders it.
	const answer = messagesChain.value[messagesChain.value.length - 1] as AiChatMessage;
	stopLoadingSteps();
	for await (const chunk of stream) {
		if (chunk.type === 'thinking') {
			answer.thinking = (answer.thinking ?? '') + chunk.content;
		} else if (chunk.type === 'thinking_reset') {
			answer.thinking = '';
		} else if (chunk.type === 'thinking_commit') {
			answer.text += answer.thinking ?? '';
			answer.thinking = '';
		} else if (chunk.type === 'text') {
			answer.text += chunk.content;
			answer.thinking = '';
		}
	}
}

/**
 * The Angular AI service showed a failed request and resolved null, so the chat added nothing. The
 * store throws the (already reported) ApiError instead; anything else, e.g. a broken stream, goes
 * into the chat as before.
 */
function isReportedApiError(error: unknown): boolean {
	return isApiError(error) && error.notified;
}

function scrollToBottom() {
	const el = chatContainer.value;
	if (el) el.scrollTop = el.scrollHeight;
}

function handleClose() {
	tableState.handleViewAIpanel();
}

function onWindowResize() {
	textareaRows.value = textareaRowsFor(window.innerHeight);
}

function onDocumentClick(event: MouseEvent) {
	if (!showCompletions.value) return;
	const target = event.target as HTMLElement | null;
	const inside = target?.closest?.('.suggestion-chip, .ai-completions, .ai-welcome-form__field');
	if (!inside) {
		showCompletions.value = false;
		activeSuggestion.value = null;
	}
}

function onSuggestionChipClick(suggestion: AiSuggestion) {
	activeSuggestion.value = suggestion;
	message.value = suggestion.prompt;
	activeCompletions.value = suggestion.completions;
	showCompletions.value = true;
	track('AI panel: suggestion chip clicked', { suggestionTitle: suggestion.title });
}

function selectCompletion(completion: string) {
	message.value = completion;
	showCompletions.value = false;
	activeSuggestion.value = null;
	createThread(completion);
	track('AI panel: completion selected', { completion });
}

function onWelcomeInput(value: string) {
	message.value = value;
	if (message.value.length > 0 && (!activeSuggestion.value || message.value !== activeSuggestion.value.prompt)) {
		showCompletions.value = false;
		activeSuggestion.value = null;
	}
}

function onCompletionHover(completion: string) {
	message.value = completion;
}

function onCompletionMouseLeave() {
	if (activeSuggestion.value) message.value = activeSuggestion.value.prompt;
}

function onWelcomeInputFocus() {
	if (activeSuggestion.value) showCompletions.value = true;
}

function track(action: string, properties?: Record<string, unknown>) {
	trackEvent(action, properties);
	if (properties) posthog.capture(action, properties);
	else posthog.capture(action);
}
</script>

<template>
	<section
		class="ai-panel"
		:class="{ 'ai-panel--expanded': isExpanded, 'ai-panel--sidebar-collapsed': !sidebarExpanded }"
		aria-labelledby="ai-panel-title"
	>
		<div class="ai-panel__header">
			<h2 id="ai-panel-title" class="ai-panel__title">AI insights</h2>
			<UiIconButton icon="close" label="Close AI insights" @click="handleClose" />
		</div>

		<div class="ai-panel__chat">
			<div v-if="messagesChain.length" ref="chatContainer" class="ai-panel__messages">
				<div class="ai-panel__chain">
					<div v-for="(entry, index) in messagesChain" :key="index" :class="`${entry.type}-message`">
						<span v-if="entry.type === 'user'" class="user-message__text">{{ entry.text }}</span>
						<template v-else-if="entry.type === 'ai'">
							<div v-if="entry.thinking && !entry.text" class="ai-thinking">{{ entry.thinking }}</div>
							<AppMarkdown v-if="entry.text" :source="entry.text" mermaid />
						</template>
						<template v-else>{{ entry.text }}</template>
					</div>
				</div>
			</div>

			<div v-else class="ai-welcome">
				<div class="ai-welcome__content">
					<img :src="AI_ROCKET_URL" alt="" class="ai-welcome__icon">
					<p class="ai-welcome__title">Ask anything about your data</p>

					<div class="ai-welcome__input">
						<form class="ai-welcome-form" @submit.prevent="createThread()">
							<div class="ai-welcome-form__field">
								<UiInput
									:model-value="message"
									name="welcomeMessage"
									placeholder="Ask a question about this table..."
									aria-label="Ask a question about this table..."
									autocomplete="off"
									maxlength="255"
									@update:model-value="onWelcomeInput"
									@focus="onWelcomeInputFocus"
								/>
								<UiIconButton icon="send" label="Send" type="submit" size="sm" class="ai-welcome-form__button" />
							</div>
						</form>

						<div
							v-if="showCompletions && activeCompletions.length"
							class="ai-completions"
							@mouseleave="onCompletionMouseLeave"
						>
							<button
								v-for="completion in activeCompletions"
								:key="completion"
								type="button"
								class="ai-completions__item"
								@mouseenter="onCompletionHover(completion)"
								@mousedown="selectCompletion(completion)"
							>
								{{ completion }}
							</button>
						</div>
					</div>

					<div class="ai-categories">
						<div v-for="category in SUGGESTION_CATEGORIES" :key="category.title" class="ai-category">
							<p class="ai-category__title">{{ category.title }}</p>
							<div class="ai-category__chips">
								<button
									v-for="suggestion in category.suggestions"
									:key="suggestion.title"
									type="button"
									class="suggestion-chip"
									:class="{ 'suggestion-chip--active': activeSuggestion?.title === suggestion.title }"
									:aria-pressed="activeSuggestion?.title === suggestion.title ? 'true' : 'false'"
									@click="onSuggestionChipClick(suggestion)"
								>
									{{ suggestion.title }}
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div v-if="submitting" class="ai-loading" role="status">
				<span class="ai-loading__text">{{ currentLoadingStep }}</span>
				<span class="ai-loading__dots" aria-hidden="true">
					<span class="ai-loading__dot" />
					<span class="ai-loading__dot" />
					<span class="ai-loading__dot" />
				</span>
			</div>

			<form v-if="messagesChain.length" class="ai-message-form" @submit.prevent="submitChat">
				<UiTextarea
					v-model="message"
					class="ai-message-form__textarea"
					name="message"
					:rows="textareaRows"
					placeholder="Ask a question about this table..."
					aria-label="Ask a question about this table..."
					data-testid="user-message"
					maxlength="255"
					@keydown="onKeydown"
				/>
				<div class="ai-message-form__footer">
					<span class="ai-message-form__count">{{ charactrsNumber }} / 256</span>
					<UiIconButton icon="send" label="Send" type="submit" size="sm" class="ai-message-form__button" />
				</div>
			</form>

			<p v-if="messagesChain.length" class="ai-panel__footer">
				AI may provide inaccurate responses.<br>Check our
				<a href="https://rocketadmin.com/privacy/" class="ai-panel__link">Privacy policy</a>.
			</p>
		</div>
	</section>
</template>

<style scoped>
.ai-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--color-surface);
  border-inline-start: 1px solid var(--color-line);
}

.ai-panel--expanded {
  border-inline-start: none;
}

.ai-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: var(--space-5) var(--space-4) 0;
}

.ai-panel__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-md);
  font-weight: var(--weight-semibold);
  color: var(--color-ink);
}

.ai-panel__chat {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  flex: 1;
  min-height: 0;
  padding: 0 var(--space-4);
  overflow: hidden;
}

.ai-panel--expanded .ai-panel__chat {
  align-items: center;
}

.ai-panel--expanded .ai-panel__messages,
.ai-panel--expanded .ai-message-form,
.ai-panel--expanded .ai-panel__footer {
  width: 100%;
  max-width: 50rem;
}

.ai-panel__messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin-bottom: var(--space-6);
}

.ai-panel__chain {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 100%;
  width: 100%;
}

.user-message {
  align-self: flex-end;
  max-width: 80%;
  margin: var(--space-1) 0 var(--space-4);
  padding: var(--space-3) var(--space-4) var(--space-4);
  border-radius: var(--radius-control);
  background: var(--color-paper-2);
  font-size: var(--text-sm);
  color: var(--color-ink);
}

.user-message__text {
  white-space: pre-wrap;
}

.ai-message {
  align-self: flex-start;
  max-width: 100%;
  margin: var(--space-1) 0;
  padding: var(--space-3) var(--space-4) var(--space-2);
  border-radius: var(--radius-control);
  background: var(--color-paper);
  overflow-x: auto;
}

.ai-message :deep(table) {
  min-width: 100%;
  width: max-content;
  margin: var(--space-2) 0;
  border-collapse: collapse;
  font-size: var(--text-xs);
}

.ai-message :deep(thead) {
  background: var(--color-paper-2);
}

.ai-message :deep(th),
.ai-message :deep(td) {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-line);
  text-align: start;
  white-space: nowrap;
}

.ai-message :deep(th) {
  font-weight: var(--weight-semibold);
}

.ai-message :deep(ol),
.ai-message :deep(ul) {
  margin: var(--space-2) 0;
  padding-inline-start: var(--space-5);
}

.ai-message :deep(li) {
  margin: var(--space-1) 0;
}

.ai-message :deep(pre) {
  white-space: break-spaces;
}

.ai-message :deep(p) {
  margin: 0 0 var(--space-2);
}

.ai-thinking {
  font-size: var(--text-xs);
  line-height: var(--leading-normal);
  font-style: italic;
  color: var(--color-muted);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.ai-error-message {
  margin: var(--space-1) 0;
  padding: var(--space-2);
  border: 1px solid var(--color-danger-border);
  border-radius: var(--radius-control);
  background: var(--color-danger-bg);
  font-size: var(--text-sm);
  color: var(--color-danger-strong);
}

.ai-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 0;
  padding: var(--space-4);
  overflow: hidden;
}

.ai-welcome__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 31.25rem;
  gap: var(--space-6);
}

.ai-welcome__icon {
  width: 3rem;
  height: 3rem;
  animation: ai-rocket-float 3s ease-in-out infinite;
}

.ai-welcome__title {
  margin: 0;
  font-size: var(--text-md);
  font-weight: var(--weight-medium);
  color: var(--color-ink-soft);
  text-align: center;
}

.ai-welcome__input {
  position: relative;
  width: 100%;
}

.ai-welcome-form__field {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding-inline-end: var(--space-1);
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
}

.ai-welcome-form__field:focus-within {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-focus);
}

.ai-welcome-form__field :deep(.ui-input) {
  flex: 1;
  border: none;
  background: transparent;
  box-shadow: none;
}

.ai-completions {
  position: absolute;
  top: calc(100% + var(--space-1));
  left: 0;
  right: 0;
  z-index: var(--z-dropdown);
  display: flex;
  flex-direction: column;
  padding: var(--space-1) 0;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-card);
  background: var(--color-surface-raised);
  box-shadow: var(--shadow-lift);
}

.ai-completions__item {
  padding: var(--space-2) var(--space-4);
  border: 0;
  background: transparent;
  font: inherit;
  font-size: var(--text-sm);
  color: var(--color-ink);
  text-align: start;
  cursor: pointer;
}

.ai-completions__item:hover,
.ai-completions__item:focus-visible {
  outline: none;
  background: var(--color-paper-2);
}

.ai-categories {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: var(--space-4);
}

.ai-category {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.ai-category__title {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-muted);
}

.ai-category__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.suggestion-chip {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  font: inherit;
  font-size: var(--text-xs);
  color: var(--color-ink);
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out);
}

.suggestion-chip:hover,
.suggestion-chip--active {
  background: var(--color-paper-2);
}

.suggestion-chip--active {
  border-color: var(--color-accent);
}

.suggestion-chip:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

.ai-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  gap: var(--space-2);
  height: 3rem;
}

.ai-loading__text {
  font-size: var(--text-sm);
  color: var(--color-muted);
}

.ai-loading__dots {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.ai-loading__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-muted-soft);
  animation: ai-loading-bounce 1.4s ease-in-out infinite;
}

.ai-loading__dot:nth-child(2) {
  animation-delay: 0.15s;
}

.ai-loading__dot:nth-child(3) {
  animation-delay: 0.3s;
}

.ai-message-form {
  position: relative;
  flex-shrink: 0;
  width: 100%;
}

.ai-message-form__textarea {
  width: 100%;
  padding-bottom: var(--space-10);
  resize: none;
}

.ai-message-form__footer {
  position: absolute;
  right: var(--space-1);
  bottom: var(--space-1);
  left: var(--space-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ai-message-form__count {
  font-size: var(--text-xs);
  color: var(--color-muted);
}

.ai-panel__footer {
  flex-shrink: 0;
  margin: var(--space-2) 0 0;
  padding-bottom: var(--space-4);
  font-size: var(--text-xs);
  color: var(--color-muted);
  text-align: center;
}

.ai-panel__link {
  color: var(--color-accent);
}

@keyframes ai-rocket-float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-2px) rotate(2deg); }
}

@keyframes ai-loading-bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-8px); }
}

@media (prefers-reduced-motion: reduce) {
  .ai-welcome__icon,
  .ai-loading__dot {
    animation: none;
  }
}
</style>
