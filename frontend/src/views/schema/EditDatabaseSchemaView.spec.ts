import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { vTooltip } from '@/components/ui';
import type { SchemaChangeBatchResponse, SchemaChangeResponse } from '@/stores/table-schema';
import EditDatabaseSchemaView from './EditDatabaseSchemaView.vue';

const tableSchema = vi.hoisted(() => ({
	generateSchemaChange: vi.fn(),
	approveBatch: vi.fn(),
	rejectBatch: vi.fn(),
	fetchDiagram: vi.fn(),
	previewDiagram: vi.fn(),
}));
vi.mock('@/stores/table-schema', () => ({ useTableSchemaStore: () => tableSchema }));

const mermaid = vi.hoisted(() => ({ initialize: vi.fn(), render: vi.fn() }));
vi.mock('mermaid', () => ({ default: mermaid }));

const DIAGRAM = 'erDiagram\n  users {\n    int id\n  }';
const PREVIEW = 'erDiagram\n  users {\n    int id\n  }\n  posts {\n    int id\n  }';

function change(overrides: Partial<SchemaChangeResponse> = {}): SchemaChangeResponse {
	return {
		id: 'ch1',
		connectionId: 'c1',
		batchId: 'b1',
		orderInBatch: 0,
		forwardSql: 'CREATE TABLE posts (id SERIAL, user_id INTEGER NOT NULL REFERENCES users(id), PRIMARY KEY (id))',
		rollbackSql: 'DROP TABLE posts',
		userModifiedSql: null,
		status: 'pending',
		changeType: 'CREATE_TABLE',
		targetTableName: 'posts',
		databaseType: 'postgres',
		executionError: null,
		isReversible: true,
		userPrompt: 'Blog',
		aiSummary: 'Stores blog posts',
		aiReasoning: null,
		createdAt: '',
		appliedAt: null,
		rolledBackAt: null,
		...overrides,
	};
}

const generated: SchemaChangeBatchResponse = { batchId: 'b1', changes: [change()], threadId: 'th1' };

async function mountPage() {
	setActivePinia(createPinia());
	const Blank = defineComponent({ render: () => h('div', { 'data-testid': 'blank-page' }) });
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/edit-database-schema/:connectionId', component: EditDatabaseSchemaView },
			{ path: '/:pathMatch(.*)*', component: Blank },
		],
	});
	router.push('/edit-database-schema/c1');
	await router.isReady();
	const wrapper = mount(defineComponent({ render: () => h(RouterView) }), {
		global: { plugins: [router], directives: { tooltip: vTooltip } },
		attachTo: document.body,
	});
	await flushPromises();
	return { wrapper, router };
}

const textarea = (wrapper: VueWrapper) => wrapper.find('[data-testid="schema-prompt-textarea"]');

async function sendPrompt(wrapper: VueWrapper, prompt: string) {
	await textarea(wrapper).setValue(prompt);
	await wrapper.find('form').trigger('submit');
	await settle();
}

/** Lets the lazily imported node-sql-parser load and the editor finish its updates. */
async function settle() {
	await flushPromises();
	await vi.dynamicImportSettled();
	await flushPromises();
}

describe('EditDatabaseSchemaView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tableSchema.fetchDiagram.mockResolvedValue({ diagram: DIAGRAM });
		tableSchema.previewDiagram.mockResolvedValue({ diagram: PREVIEW });
		tableSchema.generateSchemaChange.mockResolvedValue(generated);
		tableSchema.approveBatch.mockResolvedValue({ batchId: 'b1', changes: [change({ status: 'applied' })] });
		tableSchema.rejectBatch.mockResolvedValue({ batchId: 'b1', changes: [] });
		mermaid.render.mockImplementation(async (_id: string, code: string) => ({
			svg: `<svg data-code="${code.length}"></svg>`,
		}));
	});

	it('shows the title, a back link and the current diagram of the connection', async () => {
		const { wrapper } = await mountPage();

		expect(wrapper.find('h1').text()).toBe('Edit Database Schema');
		expect(wrapper.find('a[aria-label="Back to connections"]').attributes('href')).toBe('/connections-list');
		expect(tableSchema.fetchDiagram).toHaveBeenCalledWith('c1');
		expect(wrapper.find('.schema-diagram__title').text()).toBe('Current Database Structure');
		expect(mermaid.render).toHaveBeenCalledWith(expect.any(String), `${DIAGRAM}\n`);
		expect(wrapper.text()).toContain('Describe what you need and AI will generate the SQL.');
		expect(textarea(wrapper).attributes('placeholder')).toBe('Describe the changes you need...');
		wrapper.unmount();
	});

	it('shows the welcome templates when the database has no tables yet', async () => {
		tableSchema.fetchDiagram.mockResolvedValue({ diagram: 'erDiagram\n' });
		const { wrapper } = await mountPage();

		expect(wrapper.find('.schema-diagram').exists()).toBe(false);
		expect(wrapper.text()).toContain('Create your first table');
		expect(wrapper.text()).toContain('Try asking');
		expect(textarea(wrapper).attributes('placeholder')).toBe('Describe the database you need...');

		const crm = wrapper.findAll('.template-card').find((card) => card.text().includes('CRM'));
		await crm?.trigger('click');
		expect((textarea(wrapper).element as HTMLTextAreaElement).value).toBe(
			'CRM with contacts, companies, deals, activities, and notes',
		);
		await wrapper.findAll('.try-asking-item')[1]?.trigger('click');
		expect((textarea(wrapper).element as HTMLTextAreaElement).value).toBe('Booking app for a yoga studio');
		wrapper.unmount();
	});

	it('shows the diagram loader while the diagram is fetched, and the welcome if it fails', async () => {
		let fail: (error: Error) => void = () => {};
		tableSchema.fetchDiagram.mockReturnValue(new Promise((_, reject) => (fail = reject)));
		const { wrapper } = await mountPage();
		expect(wrapper.text()).toContain('Loading diagram');

		fail(new Error('nope'));
		await flushPromises();
		expect(wrapper.text()).not.toContain('Loading diagram');
		expect(wrapper.text()).toContain('Create your first table');
		wrapper.unmount();
	});

	it('generates changes from the prompt, lists them as cards and previews the diagram', async () => {
		const { wrapper } = await mountPage();
		await sendPrompt(wrapper, '  Blog platform  ');

		expect(tableSchema.generateSchemaChange).toHaveBeenCalledWith('c1', 'Blog platform', undefined);
		expect(tableSchema.previewDiagram).toHaveBeenCalledWith('c1', [change().forwardSql]);
		expect(wrapper.find('[data-testid="schema-message-user"]').text()).toBe('Blog platform');
		expect(wrapper.find('[data-testid="schema-message-ai"]').text()).toContain(
			"I've generated 1 change(s) for your database. Review them below and approve or reject.",
		);

		const card = wrapper.find('[data-testid="schema-change-card"]');
		expect(card.text()).toContain('Create table');
		expect(card.text()).toContain('posts');
		expect(card.text()).toContain('Stores blog posts');
		expect(card.findAll('.change-card__column-name').map((c) => c.text())).toEqual(['id', 'user_id']);
		expect(card.text()).toContain('PK');
		expect(card.text()).toContain('FK');
		expect(card.text()).toContain('NOT NULL');
		expect(card.find('pre').text()).toBe(change().forwardSql);

		expect(wrapper.find('.schema-diagram__title').text()).toBe('Schema Preview');
		expect(wrapper.find('[data-testid="schema-approve-button"]').exists()).toBe(true);
		expect(wrapper.find('form').exists()).toBe(false);
		wrapper.unmount();
	});

	it('sends the prompt on Enter but not on Shift+Enter, and continues the thread', async () => {
		tableSchema.generateSchemaChange.mockResolvedValue({ batchId: null, changes: [], threadId: 'th1' });
		const { wrapper } = await mountPage();
		await textarea(wrapper).setValue('First');
		await textarea(wrapper).trigger('keydown', { key: 'Enter', shiftKey: true });
		expect(tableSchema.generateSchemaChange).not.toHaveBeenCalled();

		await textarea(wrapper).trigger('keydown', { key: 'Enter' });
		await flushPromises();
		await sendPrompt(wrapper, 'Second');
		expect(tableSchema.generateSchemaChange.mock.calls).toEqual([
			['c1', 'First', undefined],
			['c1', 'Second', 'th1'],
		]);
		wrapper.unmount();
	});

	it('keeps the send button disabled for an empty prompt', async () => {
		const { wrapper } = await mountPage();
		const send = () => wrapper.find('[data-testid="schema-send-button"]');
		expect(send().attributes('disabled')).toBeDefined();
		await textarea(wrapper).setValue('   ');
		expect(send().attributes('disabled')).toBeDefined();
		await textarea(wrapper).setValue('x');
		expect(send().attributes('disabled')).toBeUndefined();
		wrapper.unmount();
	});

	it('shows the generating state while waiting for the AI', async () => {
		tableSchema.generateSchemaChange.mockReturnValue(new Promise(() => {}));
		const { wrapper } = await mountPage();
		await sendPrompt(wrapper, 'Blog');
		expect(wrapper.text()).toContain('Generating schema');
		expect(textarea(wrapper).attributes('disabled')).toBeDefined();
		wrapper.unmount();
	});

	it('shows the assistant clarification, or a fallback, when no changes come back', async () => {
		tableSchema.generateSchemaChange
			.mockResolvedValueOnce({ batchId: null, changes: [], assistantMessage: ' Which tables? ' })
			.mockResolvedValueOnce({ batchId: null, changes: [] });
		const { wrapper } = await mountPage();
		await sendPrompt(wrapper, 'something');
		await sendPrompt(wrapper, 'else');
		const ai = wrapper.findAll('[data-testid="schema-message-ai"]').map((m) => m.text());
		expect(ai).toEqual([
			'Which tables?',
			'I could not generate any schema changes for that prompt. Could you describe your database in more detail?',
		]);
		expect(tableSchema.previewDiagram).not.toHaveBeenCalled();
		wrapper.unmount();
	});

	it('shows a generation error inline', async () => {
		tableSchema.generateSchemaChange
			.mockRejectedValueOnce(new Error('AI is busy'))
			.mockRejectedValueOnce(new Error(''));
		const { wrapper } = await mountPage();
		await sendPrompt(wrapper, 'one');
		await sendPrompt(wrapper, 'two');
		expect(wrapper.findAll('[data-testid="schema-message-error"]').map((m) => m.text())).toEqual([
			'error_outlineAI is busy',
			'error_outlineFailed to generate schema changes.',
		]);
		wrapper.unmount();
	});

	it('still lists the changes when the preview diagram fails', async () => {
		tableSchema.previewDiagram.mockRejectedValue(new Error('preview failed'));
		const { wrapper } = await mountPage();
		await sendPrompt(wrapper, 'Blog');
		expect(wrapper.find('[data-testid="schema-change-card"]').exists()).toBe(true);
		expect(wrapper.find('.schema-diagram__title').text()).toBe('Current Database Structure');
		wrapper.unmount();
	});

	it('applies the batch, reloads the diagram and offers to open the tables', async () => {
		const { wrapper, router } = await mountPage();
		await sendPrompt(wrapper, 'Blog');
		tableSchema.fetchDiagram.mockResolvedValue({ diagram: PREVIEW });

		await wrapper.find('[data-testid="schema-approve-button"]').trigger('click');
		await flushPromises();

		expect(tableSchema.approveBatch).toHaveBeenCalledWith('b1', true);
		expect(tableSchema.fetchDiagram).toHaveBeenCalledTimes(2);
		expect(wrapper.text()).toContain('All changes applied successfully! Your tables have been created.');
		expect(wrapper.find('.schema-diagram__title').text()).toBe('Updated Database Structure');
		expect(wrapper.find('[data-testid="schema-approve-button"]').exists()).toBe(false);
		expect(wrapper.find('form').exists()).toBe(true);

		const open = wrapper.find('[data-testid="schema-open-tables-button"]');
		expect(open.attributes('href')).toBe('/dashboard/c1?uncached=true');
		await open.trigger('click');
		await flushPromises();
		expect(router.currentRoute.value.fullPath).toBe('/dashboard/c1?uncached=true');
		wrapper.unmount();
	});

	it('mentions the statements the AI had to repair', async () => {
		tableSchema.approveBatch.mockResolvedValue({
			batchId: 'b1',
			changes: [change({ status: 'applied', aiAutoFixApplied: true, aiAutoFixOriginalError: 'syntax\n error' })],
		});
		const { wrapper } = await mountPage();
		await sendPrompt(wrapper, 'Blog');
		await wrapper.find('[data-testid="schema-approve-button"]').trigger('click');
		await flushPromises();
		expect(wrapper.text()).toContain(
			'All changes applied successfully! 1 statement(s) needed an AI repair before they could be applied — the originals failed against the database (e.g. posts: syntax error).',
		);
		wrapper.unmount();
	});

	it('reports failed changes and keeps the batch pending', async () => {
		tableSchema.approveBatch.mockResolvedValue({
			batchId: 'b1',
			changes: [change({ status: 'failed', executionError: 'relation exists' }), change({ id: 'ch2' })],
		});
		const { wrapper } = await mountPage();
		await sendPrompt(wrapper, 'Blog');
		await wrapper.find('[data-testid="schema-approve-button"]').trigger('click');
		await flushPromises();
		expect(wrapper.find('[data-testid="schema-message-error"]').text()).toContain(
			'1 change(s) failed: relation exists',
		);
		expect(wrapper.find('[data-testid="schema-approve-button"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="schema-open-tables-button"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it('shows an apply error and the applying state', async () => {
		let fail: (error: Error) => void = () => {};
		tableSchema.approveBatch.mockReturnValue(new Promise((_, reject) => (fail = reject)));
		const { wrapper } = await mountPage();
		await sendPrompt(wrapper, 'Blog');
		await wrapper.find('[data-testid="schema-approve-button"]').trigger('click');
		await flushPromises();
		const approve = wrapper.find('[data-testid="schema-approve-button"]');
		expect(approve.text()).toBe('Applying...');
		expect(approve.attributes('disabled')).toBeDefined();
		expect(wrapper.find('[data-testid="schema-reject-button"]').attributes('disabled')).toBeDefined();

		fail(new Error(''));
		await flushPromises();
		expect(wrapper.find('[data-testid="schema-message-error"]').text()).toContain('Failed to apply schema changes.');
		wrapper.unmount();
	});

	it('rejects the batch and drops the preview diagram', async () => {
		const { wrapper } = await mountPage();
		await sendPrompt(wrapper, 'Blog');
		expect(wrapper.find('.schema-diagram__title').text()).toBe('Schema Preview');

		await wrapper.find('[data-testid="schema-reject-button"]').trigger('click');
		await flushPromises();
		expect(tableSchema.rejectBatch).toHaveBeenCalledWith('b1');
		expect(wrapper.text()).toContain('Changes rejected. Feel free to describe what you need differently.');
		expect(wrapper.find('.schema-diagram__title').text()).toBe('Current Database Structure');
		expect(wrapper.find('form').exists()).toBe(true);
		// The rejected changes stay in the chat history.
		expect(wrapper.find('[data-testid="schema-change-card"]').exists()).toBe(true);
		wrapper.unmount();
	});

	it('clears the batch even when the reject request fails (the store reports it)', async () => {
		tableSchema.rejectBatch.mockRejectedValue(new Error('notified'));
		const { wrapper } = await mountPage();
		await sendPrompt(wrapper, 'Blog');
		await wrapper.find('[data-testid="schema-reject-button"]').trigger('click');
		await flushPromises();
		expect(wrapper.text()).toContain('Changes rejected.');
		expect(wrapper.find('form').exists()).toBe(true);
		wrapper.unmount();
	});
});
