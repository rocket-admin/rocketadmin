<script setup lang="ts">
// Port of frontend/src/app/components/edit-database-schema (EditDatabaseSchemaComponent): the AI
// schema assistant. A prompt goes to the table-schema generator, the proposed batch of changes is
// shown as cards (with a preview diagram), and the batch is applied or rejected. The ER diagram of
// the connection sits on the left.
//
// Angular used one component both as the /edit-database-schema page and embedded in the dashboard
// (with a close button). Here the page is EditDatabaseSchemaView, which renders this with `routed`;
// the dashboard can embed it with `showClose`. The diagram loads only in those two modes, as before.
import { computed, onMounted, ref } from 'vue';
import { UiButton, UiIcon, UiIconButton, UiTextarea } from '@/components/ui';
import { type SchemaChangeResponse, useTableSchemaStore } from '@/stores/table-schema';
import SchemaDiagramViewer from './SchemaDiagramViewer.vue';
import { mermaidHasEntities, type ParsedChange, parseChange, summarizeError } from './schemaChanges';

interface ChatMessage {
	role: 'user' | 'ai' | 'error' | 'diagram';
	text: string;
	diagramSource?: string;
	changes?: SchemaChangeResponse[];
	parsedChanges?: ParsedChange[];
	batchId?: string | null;
}

const props = withDefaults(
	defineProps<{
		connectionId: string;
		/** Shows a close button (the editor embedded in the dashboard) and loads the diagram. */
		showClose?: boolean;
		/** The editor is the page: shows the back link and title, and loads the diagram. */
		routed?: boolean;
	}>(),
	{ showClose: false, routed: false },
);

const emit = defineEmits<{
	/** "Open tables" was clicked after the changes were applied. */
	schemaApplied: [];
	close: [];
}>();

const tableSchema = useTableSchemaStore();

const templates = [
	{
		icon: 'shopping_cart',
		title: 'E-commerce store',
		tables: 'products · categories · orders · customers',
		prompt: 'E-commerce database with products, categories, orders, and customers',
	},
	{
		icon: 'article',
		title: 'Blog platform',
		tables: 'users · posts · comments · tags',
		prompt: 'Blog platform with users, posts, comments, and tags',
	},
	{
		icon: 'view_kanban',
		title: 'Project management',
		tables: 'projects · tasks · users · comments',
		prompt: 'Project management tool with projects, tasks, users, and comments',
	},
	{
		icon: 'contacts',
		title: 'CRM',
		tables: 'contacts · companies · deals · activities · notes',
		prompt: 'CRM with contacts, companies, deals, activities, and notes',
	},
];

const tryAsking = [
	'Inventory system with suppliers and stock alerts',
	'Booking app for a yoga studio',
	'Multi-tenant SaaS with workspaces',
];

const messages = ref<ChatMessage[]>([]);
const userPrompt = ref('');
const submitting = ref(false);
const applying = ref(false);
const applied = ref(false);
const initialDiagramLoading = ref(false);
let threadId: string | undefined;

/** Index of the latest message whose batch is still awaiting approve/reject. */
const pendingBatchIndex = computed(() => {
	for (let i = messages.value.length - 1; i >= 0; i--) {
		const message = messages.value[i];
		if (message?.batchId && message.changes?.length) return i;
	}
	return -1;
});
const pendingBatch = computed(() => messages.value[pendingBatchIndex.value] ?? null);

const currentDiagram = computed(() => {
	for (let i = messages.value.length - 1; i >= 0; i--) {
		const message = messages.value[i];
		if (message?.role === 'diagram' && message.diagramSource) return message;
	}
	return null;
});

const chatMessages = computed(() => messages.value.filter((m) => m.role !== 'diagram'));

const promptLabel = computed(() =>
	currentDiagram.value ? 'Describe the changes you need...' : 'Describe the database you need...',
);

onMounted(() => {
	if (props.showClose || props.routed) loadDiagram('Current Database Structure');
});

async function submit() {
	const prompt = userPrompt.value.trim();
	if (!prompt || submitting.value) return;

	messages.value.push({ role: 'user', text: prompt });
	userPrompt.value = '';
	submitting.value = true;

	try {
		const result = await tableSchema.generateSchemaChange(props.connectionId, prompt, threadId);
		if (result.threadId) threadId = result.threadId;
		if (result.changes.length > 0) {
			applied.value = false;
			let previewSource = '';
			try {
				const preview = await tableSchema.previewDiagram(
					props.connectionId,
					result.changes.map((c) => c.forwardSql),
				);
				previewSource = preview.diagram ?? '';
			} catch {
				// preview is supplementary — don't block the change list on a diagram failure
			}
			const parsedChanges = await Promise.all(result.changes.map((c) => parseChange(c)));
			messages.value.push({
				role: 'ai',
				text: `I've generated ${result.changes.length} change(s) for your database. Review them below and approve or reject.`,
				changes: result.changes,
				parsedChanges,
				batchId: result.batchId,
			});
			if (previewSource) {
				messages.value.push({
					role: 'diagram',
					text: 'Schema Preview',
					diagramSource: `\`\`\`mermaid\n${previewSource}\n\`\`\``,
				});
			}
		} else {
			const clarification = result.assistantMessage?.trim();
			messages.value.push({
				role: 'ai',
				text:
					clarification ||
					'I could not generate any schema changes for that prompt. Could you describe your database in more detail?',
			});
		}
	} catch (error) {
		messages.value.push({ role: 'error', text: errorText(error, 'Failed to generate schema changes.') });
	} finally {
		submitting.value = false;
	}
}

async function approve() {
	const batch = pendingBatch.value;
	if (!batch?.batchId || applying.value) return;
	const batchIndex = pendingBatchIndex.value;

	applying.value = true;
	try {
		const result = await tableSchema.approveBatch(batch.batchId, true);
		const failed = result.changes.filter((c) => c.status === 'failed');
		if (failed.length > 0) {
			messages.value.push({
				role: 'error',
				text: `${failed.length} change(s) failed: ${failed.map((c) => c.executionError).join('; ')}`,
			});
		} else {
			applied.value = true;
			const autoFixed = result.changes.filter((c) => c.aiAutoFixApplied);
			const successText =
				autoFixed.length > 0
					? `All changes applied successfully! ${autoFixed.length} statement(s) needed an AI repair before they could be applied — the originals failed against the database (e.g. ${autoFixed
							.map((c) => `${c.targetTableName}: ${summarizeError(c.aiAutoFixOriginalError)}`)
							.slice(0, 2)
							.join('; ')}).`
					: 'All changes applied successfully! Your tables have been created.';
			messages.value = messages.value
				.map((m, i) => (i === batchIndex ? { ...m, batchId: undefined } : m))
				.concat({ role: 'ai', text: successText });
			loadDiagram('Updated Database Structure');
		}
	} catch (error) {
		messages.value.push({ role: 'error', text: errorText(error, 'Failed to apply schema changes.') });
	} finally {
		applying.value = false;
	}
}

async function reject() {
	const batch = pendingBatch.value;
	if (!batch?.batchId) return;
	const batchIndex = pendingBatchIndex.value;

	try {
		await tableSchema.rejectBatch(batch.batchId);
	} catch {
		// The store has shown the error; Angular carried on with a null result, so does this.
	}
	messages.value = messages.value
		.map((m, i) => (i === batchIndex ? { ...m, batchId: undefined } : m))
		.filter((m) => !(m.role === 'diagram' && m.text === 'Schema Preview'))
		.concat({ role: 'ai', text: 'Changes rejected. Feel free to describe what you need differently.' });
}

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter' && !event.shiftKey) {
		event.preventDefault();
		submit();
	}
}

async function loadDiagram(label: string) {
	initialDiagramLoading.value = true;
	try {
		const diagram = await tableSchema.fetchDiagram(props.connectionId);
		const source = diagram?.diagram ?? '';
		if (mermaidHasEntities(source)) {
			messages.value.push({ role: 'diagram', text: label, diagramSource: `\`\`\`mermaid\n${source}\n\`\`\`` });
		}
	} catch {
		// Diagram is supplementary - don't show error if it fails
	} finally {
		initialDiagramLoading.value = false;
	}
}

function errorText(error: unknown, fallback: string): string {
	return error instanceof Error && error.message ? error.message : fallback;
}
</script>

<template>
	<div class="schema-editor">
		<div v-if="routed" class="schema-editor__header">
			<UiIconButton icon="arrow_back" label="Back to connections" to="/connections-list" />
			<h1 class="schema-editor__title">Edit Database Schema</h1>
		</div>
		<UiIconButton
			v-if="showClose"
			icon="close"
			label="Close"
			class="schema-editor__close-button"
			data-testid="schema-close-button"
			@click="emit('close')"
		/>

		<div class="schema-editor__body">
			<!-- Canvas: diagram or welcome -->
			<section class="schema-editor__canvas" aria-label="Database diagram">
				<SchemaDiagramViewer
					v-if="currentDiagram"
					class="schema-editor__diagram"
					:title="currentDiagram.text"
					:source="currentDiagram.diagramSource"
				/>
				<div v-else-if="initialDiagramLoading" class="schema-editor__diagram-loading" role="status">
					<span class="schema-editor__loading-text">Loading diagram</span>
					<span class="schema-editor__loading-dots" aria-hidden="true">
						<span class="schema-editor__loading-dot" />
						<span class="schema-editor__loading-dot" />
						<span class="schema-editor__loading-dot" />
					</span>
				</div>
				<div v-else class="schema-editor__welcome">
					<div class="schema-editor__welcome-icon-box">
						<UiIcon name="schema" class="schema-editor__welcome-icon" />
					</div>
					<div class="schema-editor__welcome-heading">
						<p class="schema-editor__welcome-title">Create your first table</p>
						<p class="schema-editor__welcome-subtitle">Describe what you need and AI will generate the SQL</p>
					</div>

					<div class="schema-editor__suggestions-block">
						<p class="schema-editor__suggestions-heading">or use a template</p>
						<div class="schema-editor__templates">
							<button
								v-for="template in templates"
								:key="template.title"
								type="button"
								class="template-card"
								@click="userPrompt = template.prompt"
							>
								<span class="template-card__head">
									<span class="template-card__icon-box">
										<UiIcon :name="template.icon" size="sm" class="template-card__icon" />
									</span>
									<span class="template-card__title">{{ template.title }}</span>
								</span>
								<span class="template-card__tables">{{ template.tables }}</span>
							</button>
						</div>
					</div>
				</div>
			</section>

			<!-- Right-docked chat panel -->
			<aside class="schema-editor__panel" aria-labelledby="schema-editor-panel-title">
				<div class="schema-editor__panel-header">
					<UiIcon name="smart_toy" size="sm" class="schema-editor__panel-icon" />
					<span id="schema-editor-panel-title" class="schema-editor__panel-title">Schema Assistant</span>
				</div>

				<div class="schema-editor__messages" aria-live="polite">
					<template v-if="chatMessages.length === 0 && !submitting">
						<p v-if="currentDiagram" class="schema-editor__messages-empty">
							Describe what you need and AI will generate the SQL.
						</p>
						<div v-else class="schema-editor__try-asking-block">
							<p class="schema-editor__try-asking-heading">Try asking</p>
							<div class="schema-editor__try-asking">
								<button
									v-for="suggestion in tryAsking"
									:key="suggestion"
									type="button"
									class="try-asking-item"
									@click="userPrompt = suggestion"
								>
									<UiIcon name="auto_awesome" size="sm" class="try-asking-item__icon" />
									<span>“{{ suggestion }}”</span>
								</button>
							</div>
						</div>
					</template>

					<template v-for="(message, index) in chatMessages" :key="index">
						<div
							v-if="message.role === 'user'"
							class="schema-editor__message schema-editor__message--user"
							data-testid="schema-message-user"
						>
							<span>{{ message.text }}</span>
						</div>
						<div
							v-else-if="message.role === 'ai'"
							class="schema-editor__message schema-editor__message--ai"
							data-testid="schema-message-ai"
						>
							<span class="schema-editor__message-text">{{ message.text }}</span>

							<div v-if="message.parsedChanges?.length" class="schema-editor__changes">
								<div
									v-for="change in message.parsedChanges"
									:key="change.id"
									class="change-card"
									:class="`change-card--${change.tone}`"
									data-testid="schema-change-card"
								>
									<div class="change-card__head">
										<span class="change-card__action-icon">
											<UiIcon :name="change.icon" size="sm" />
										</span>
										<span class="change-card__head-text">
											<span class="change-card__action">{{ change.action }}</span>
											<span class="change-card__target">{{ change.targetTableName }}</span>
										</span>
									</div>
									<p v-if="change.aiSummary" class="change-card__summary">{{ change.aiSummary }}</p>
									<ul v-if="change.columns.length" class="change-card__columns">
										<li v-for="col in change.columns" :key="col.name" class="change-card__column">
											<span class="change-card__column-name">{{ col.name }}</span>
											<span class="change-card__column-type">{{ col.type || '—' }}</span>
											<span class="change-card__column-badges">
												<span v-if="col.pk" v-tooltip="'Primary key'" class="change-card__badge change-card__badge--pk">
													PK
												</span>
												<span
													v-if="col.fk"
													v-tooltip="col.referenceTable ? `→ ${col.referenceTable}` : 'Foreign key'"
													class="change-card__badge change-card__badge--fk"
												>
													FK
												</span>
												<span v-if="col.notNull && !col.pk" class="change-card__badge">NOT NULL</span>
												<span v-if="col.unique && !col.pk" class="change-card__badge">UNIQUE</span>
												<span v-if="col.defaultValue" class="change-card__badge">DEFAULT</span>
											</span>
										</li>
									</ul>
									<details class="change-card__sql">
										<summary>View SQL</summary>
										<pre>{{ change.forwardSql }}</pre>
									</details>
								</div>
							</div>
						</div>
						<div
							v-else-if="message.role === 'error'"
							class="schema-editor__message schema-editor__message--error"
							role="alert"
							data-testid="schema-message-error"
						>
							<UiIcon name="error_outline" size="sm" class="schema-editor__error-icon" />
							<span>{{ message.text }}</span>
						</div>
					</template>

					<div v-if="submitting" class="schema-editor__loading" role="status">
						<span class="schema-editor__loading-text">Generating schema</span>
						<span class="schema-editor__loading-dots" aria-hidden="true">
							<span class="schema-editor__loading-dot" />
							<span class="schema-editor__loading-dot" />
							<span class="schema-editor__loading-dot" />
						</span>
					</div>
					<div v-if="initialDiagramLoading && chatMessages.length > 0" class="schema-editor__loading" role="status">
						<span class="schema-editor__loading-text">Refreshing diagram</span>
						<span class="schema-editor__loading-dots" aria-hidden="true">
							<span class="schema-editor__loading-dot" />
							<span class="schema-editor__loading-dot" />
							<span class="schema-editor__loading-dot" />
						</span>
					</div>
				</div>

				<div v-if="applied && !initialDiagramLoading" class="schema-editor__open-tables">
					<UiButton
						:to="{ path: `/dashboard/${connectionId}`, query: { uncached: 'true' } }"
						data-testid="schema-open-tables-button"
						@click="emit('schemaApplied')"
					>
						<template #leading><UiIcon name="table_chart" size="sm" /></template>
						Open tables
					</UiButton>
				</div>

				<div class="schema-editor__form">
					<div v-if="pendingBatch" class="schema-editor__actions">
						<UiButton
							variant="secondary"
							:disabled="applying"
							data-testid="schema-reject-button"
							@click="reject"
						>
							Reject
						</UiButton>
						<UiButton :disabled="applying" data-testid="schema-approve-button" @click="approve">
							<template v-if="!applying" #leading><UiIcon name="check" size="sm" /></template>
							{{ applying ? 'Applying...' : 'Apply All' }}
						</UiButton>
					</div>
					<form v-else class="schema-editor__prompt" @submit.prevent="submit">
						<UiTextarea
							v-model="userPrompt"
							name="schemaPrompt"
							:rows="2"
							maxlength="1000"
							:placeholder="promptLabel"
							:aria-label="promptLabel"
							:disabled="submitting"
							class="schema-editor__input"
							data-testid="schema-prompt-textarea"
							@keydown="onKeydown"
						/>
						<UiIconButton
							icon="send"
							label="Send"
							type="submit"
							variant="primary"
							:disabled="!userPrompt.trim() || submitting"
							class="schema-editor__send-button"
							data-testid="schema-send-button"
						/>
					</form>
				</div>
			</aside>
		</div>
	</div>
</template>

<style scoped>
.schema-editor {
	position: relative;
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	overflow: hidden;
	background: var(--color-paper);
}

/* ── Header (routed page) ── */

.schema-editor__header {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--space-2);
	padding: var(--space-6) var(--space-4) var(--space-3);
}

.schema-editor__title {
	margin: 0;
	font-family: var(--font-display);
	font-size: var(--text-xl);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

/* ── Close button (embedded panel) ── */

.schema-editor__close-button {
	position: absolute;
	top: var(--space-2);
	right: var(--space-2);
	z-index: var(--z-sticky);
}

/* ── Body (two-column) ── */

.schema-editor__body {
	flex: 1;
	display: flex;
	gap: var(--space-4);
	min-height: 0;
	padding: 0 var(--space-4) var(--space-4);
	overflow: hidden;
}

/* ── Canvas (left) ── */

.schema-editor__canvas {
	flex: 1;
	display: flex;
	min-width: 0;
}

.schema-editor__diagram {
	flex: 1;
	min-width: 0;
}

.schema-editor__diagram-loading {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--space-2);
}

/* Welcome */

.schema-editor__welcome {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--space-4);
	max-width: 32.5rem;
	margin: 0 auto;
	padding: var(--space-6);
	overflow-y: auto;
}

.schema-editor__welcome-icon-box {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--space-12);
	height: var(--space-12);
	margin-bottom: var(--space-1);
	border-radius: var(--radius-panel);
	background: var(--color-paper-2);
}

.schema-editor__welcome-icon {
	color: var(--color-accent);
	transform: rotate(-90deg);
}

.schema-editor__welcome-heading {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--space-1);
}

.schema-editor__welcome-title {
	margin: 0;
	font-size: var(--text-md);
	font-weight: var(--weight-medium);
	text-align: center;
	color: var(--color-ink);
}

.schema-editor__welcome-subtitle {
	margin: 0;
	font-size: var(--text-sm);
	text-align: center;
	color: var(--color-muted);
}

.schema-editor__suggestions-block {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--space-2);
	margin-top: var(--space-2);
}

.schema-editor__suggestions-heading,
.schema-editor__try-asking-heading {
	margin: 0;
	font-size: var(--text-2xs);
	font-weight: var(--weight-semibold);
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--color-muted-soft);
}

.schema-editor__templates {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--space-2);
	width: 100%;
	max-width: 28.75rem;
}

.template-card {
	display: flex;
	flex-direction: column;
	gap: var(--space-1);
	padding: var(--space-2) var(--space-3);
	border: 1px solid var(--color-line);
	border-radius: var(--radius-card);
	background: var(--color-surface);
	font: inherit;
	text-align: left;
	color: var(--color-ink);
	cursor: pointer;
	transition:
		border-color var(--motion-fast) var(--ease-out),
		box-shadow var(--motion-fast) var(--ease-out);
}

.template-card:hover {
	border-color: var(--color-accent);
	box-shadow: var(--shadow-card);
}

.template-card:focus-visible,
.try-asking-item:focus-visible {
	outline: none;
	box-shadow: var(--shadow-focus);
}

.template-card__head {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	min-width: 0;
}

.template-card__icon-box {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: var(--space-5);
	height: var(--space-5);
	border-radius: var(--radius-control);
	background: var(--color-paper-2);
}

.template-card__icon {
	color: var(--color-accent);
}

.template-card__title {
	flex: 1;
	overflow: hidden;
	font-size: var(--text-sm);
	font-weight: var(--weight-semibold);
	line-height: var(--leading-snug);
	white-space: nowrap;
	text-overflow: ellipsis;
}

.template-card__tables {
	font-size: var(--text-xs);
	line-height: var(--leading-snug);
	color: var(--color-muted);
}

/* ── Chat panel (right) ── */

.schema-editor__panel {
	display: flex;
	flex-direction: column;
	flex-shrink: 0;
	width: 25rem;
	min-height: 0;
	overflow: hidden;
	border: 1px solid var(--color-line);
	border-radius: var(--radius-panel);
	background: var(--color-surface);
}

.schema-editor__panel-header {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--space-2);
	padding: var(--space-3) var(--space-4);
	border-bottom: 1px solid var(--color-line);
}

.schema-editor__panel-icon {
	color: var(--color-accent);
}

.schema-editor__panel-title {
	font-size: var(--text-sm);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

/* Messages */

.schema-editor__messages {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: var(--space-3);
	min-height: 0;
	padding: var(--space-3) var(--space-4);
	overflow-y: auto;
}

.schema-editor__messages-empty {
	margin: var(--space-10) 0 0;
	font-size: var(--text-sm);
	line-height: var(--leading-normal);
	color: var(--color-muted);
}

.schema-editor__try-asking-block {
	display: flex;
	flex-direction: column;
	gap: var(--space-2);
	margin-top: auto;
}

.schema-editor__try-asking {
	display: flex;
	flex-direction: column;
	gap: var(--space-2);
}

.try-asking-item {
	display: flex;
	align-items: flex-start;
	gap: var(--space-2);
	padding: var(--space-2) var(--space-3);
	border: 1px dashed var(--color-line-strong);
	border-radius: var(--radius-card);
	background: none;
	font: inherit;
	font-size: var(--text-sm);
	line-height: var(--leading-snug);
	text-align: left;
	color: var(--color-ink-soft);
	cursor: pointer;
	transition:
		border-color var(--motion-fast) var(--ease-out),
		background-color var(--motion-fast) var(--ease-out);
}

.try-asking-item:hover {
	border-color: var(--color-accent);
	background-color: var(--color-paper-2);
	color: var(--color-ink);
}

.try-asking-item__icon {
	flex-shrink: 0;
	color: var(--color-accent);
}

.schema-editor__message {
	max-width: 95%;
	padding: var(--space-2) var(--space-3);
	border-radius: var(--radius-card);
	font-size: var(--text-sm);
	line-height: var(--leading-normal);
	white-space: pre-wrap;
	color: var(--color-ink);
}

.schema-editor__message--user {
	align-self: flex-end;
	background-color: var(--color-paper-2);
}

.schema-editor__message--ai {
	align-self: stretch;
	max-width: 100%;
	padding-right: 0;
	padding-left: 0;
}

.schema-editor__message--error {
	display: flex;
	align-self: flex-start;
	align-items: flex-start;
	gap: var(--space-2);
	max-width: 100%;
	border: 1px solid var(--color-danger-border);
	background-color: var(--color-danger-bg);
	color: var(--color-danger-strong);
}

.schema-editor__error-icon {
	flex-shrink: 0;
}

/* Changes */

.schema-editor__changes {
	display: flex;
	flex-direction: column;
	gap: var(--space-2);
	margin-top: var(--space-3);
	white-space: normal;
}

.change-card {
	display: flex;
	flex-direction: column;
	gap: var(--space-2);
	padding: var(--space-3);
	border: 1px solid var(--color-line);
	border-radius: var(--radius-card);
	background: var(--color-surface-raised);
}

.change-card__head {
	display: flex;
	align-items: center;
	gap: var(--space-3);
}

.change-card__action-icon {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: var(--space-8);
	height: var(--space-8);
	border-radius: var(--radius-control);
}

.change-card--add .change-card__action-icon {
	background: var(--color-success-bg);
	color: var(--color-success);
}

.change-card--edit .change-card__action-icon {
	background: var(--color-paper-2);
	color: var(--color-accent);
}

.change-card--remove .change-card__action-icon {
	background: var(--color-danger-bg);
	color: var(--color-danger);
}

.change-card__head-text {
	display: flex;
	flex-direction: column;
	gap: var(--space-05);
	min-width: 0;
}

.change-card__action {
	font-size: var(--text-2xs);
	font-weight: var(--weight-semibold);
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: var(--color-muted);
}

.change-card__target {
	overflow: hidden;
	font-family: var(--font-mono);
	font-size: var(--text-sm);
	font-weight: var(--weight-semibold);
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--color-ink);
}

.change-card__summary {
	margin: 0;
	font-size: var(--text-sm);
	line-height: var(--leading-normal);
	color: var(--color-ink-soft);
}

.change-card__columns {
	display: grid;
	grid-template-columns: max-content minmax(0, 1fr) auto;
	margin: 0;
	padding: 0;
	overflow: hidden;
	border: 1px solid var(--color-line);
	border-radius: var(--radius-control);
	font-size: var(--text-xs);
	list-style: none;
}

.change-card__column {
	display: contents;
}

.change-card__column > * {
	display: flex;
	align-items: center;
	padding: var(--space-1) var(--space-3);
	border-top: 1px solid var(--color-line);
}

.change-card__column:first-child > * {
	border-top: none;
}

.change-card__column-name {
	font-family: var(--font-mono);
	font-weight: var(--weight-medium);
	color: var(--color-ink);
}

.change-card__column-type {
	padding-left: 0 !important;
	color: var(--color-muted);
}

.change-card__column-badges {
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: var(--space-1);
}

.change-card__badge {
	padding: var(--space-05) var(--space-1);
	border-radius: var(--radius-control);
	background: var(--color-paper-2);
	font-size: var(--text-2xs);
	font-weight: var(--weight-bold);
	line-height: var(--leading-tight);
	letter-spacing: 0.05em;
	text-transform: uppercase;
	color: var(--color-muted);
}

.change-card__badge--pk {
	background: var(--color-warning-bg);
	color: var(--color-warning);
}

.change-card__badge--fk {
	color: var(--color-accent);
}

.change-card__sql {
	margin: 0;
	font-size: var(--text-xs);
}

.change-card__sql summary {
	padding: var(--space-05) 0;
	font-weight: var(--weight-medium);
	color: var(--color-muted);
	cursor: pointer;
	user-select: none;
}

.change-card__sql summary:hover {
	color: var(--color-accent);
}

.change-card__sql pre {
	margin: var(--space-2) 0 0;
	padding: var(--space-2) var(--space-3);
	overflow-x: auto;
	border-radius: var(--radius-control);
	background: var(--color-paper-2);
	font-family: var(--font-mono);
	font-size: var(--text-xs);
	white-space: pre-wrap;
}

/* Actions */

.schema-editor__actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--space-2);
}

/* Loading */

.schema-editor__loading {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	padding: var(--space-1) 0;
}

.schema-editor__loading-text {
	font-size: var(--text-sm);
	color: var(--color-muted);
}

.schema-editor__loading-dots {
	display: flex;
	align-items: center;
	gap: var(--space-1);
}

.schema-editor__loading-dot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background-color: var(--color-muted-soft);
	animation: schema-editor-bounce 1.4s ease-in-out infinite;
}

.schema-editor__loading-dot:nth-child(2) {
	animation-delay: 0.15s;
}

.schema-editor__loading-dot:nth-child(3) {
	animation-delay: 0.3s;
}

@keyframes schema-editor-bounce {
	0%,
	60%,
	100% {
		transform: translateY(0);
	}
	30% {
		transform: translateY(-8px);
	}
}

@media (prefers-reduced-motion: reduce) {
	.schema-editor__loading-dot {
		animation: none;
	}
}

/* Open tables CTA */

.schema-editor__open-tables {
	display: flex;
	flex-shrink: 0;
	justify-content: center;
	padding: var(--space-2) var(--space-4);
	border-top: 1px solid var(--color-line);
}

/* Input form */

.schema-editor__form {
	flex-shrink: 0;
	padding: var(--space-3) var(--space-4) var(--space-4);
	border-top: 1px solid var(--color-line);
}

.schema-editor__prompt {
	display: flex;
	align-items: flex-end;
	gap: var(--space-2);
}

/* Grows with its content between 2 and ~10 lines, like cdkTextareaAutosize. */
.schema-editor__input {
	flex: 1;
	min-width: 0;
	max-height: 15rem;
	field-sizing: content;
	resize: none;
}

/* Responsive: stack on narrow screens */

@media (max-width: 900px) {
	.schema-editor__body {
		flex-direction: column;
	}

	.schema-editor__panel {
		width: 100%;
		max-height: 50%;
	}
}
</style>
