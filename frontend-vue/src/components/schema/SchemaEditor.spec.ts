import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { vTooltip } from '@/components/ui';
import SchemaEditor from './SchemaEditor.vue';

// The page flows are covered by EditDatabaseSchemaView.spec.ts; this covers the embedded modes.
const tableSchema = vi.hoisted(() => ({
	generateSchemaChange: vi.fn(),
	approveBatch: vi.fn(),
	rejectBatch: vi.fn(),
	fetchDiagram: vi.fn(),
	previewDiagram: vi.fn(),
}));
vi.mock('@/stores/table-schema', () => ({ useTableSchemaStore: () => tableSchema }));
vi.mock('mermaid', () => ({ default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg></svg>' })) } }));

function mountEditor(props: { showClose?: boolean }) {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [{ path: '/:p(.*)*', component: { render: () => null } }],
	});
	return mount(SchemaEditor, {
		props: { connectionId: 'c1', ...props },
		global: { plugins: [router], directives: { tooltip: vTooltip } },
	});
}

/** Lets the lazily imported node-sql-parser load and the editor finish its updates. */
async function settle() {
	await flushPromises();
	await vi.dynamicImportSettled();
	await flushPromises();
}

describe('SchemaEditor', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tableSchema.fetchDiagram.mockResolvedValue({ diagram: 'erDiagram\n  users {\n  }' });
	});

	it('with a close button: loads the diagram, has no page header and emits close', async () => {
		const wrapper = mountEditor({ showClose: true });
		await flushPromises();
		expect(tableSchema.fetchDiagram).toHaveBeenCalledWith('c1');
		expect(wrapper.find('h1').exists()).toBe(false);
		await wrapper.find('[data-testid="schema-close-button"]').trigger('click');
		expect(wrapper.emitted('close')).toHaveLength(1);
	});

	it('plain embed: neither loads the diagram nor shows a close button', async () => {
		const wrapper = mountEditor({});
		await flushPromises();
		expect(tableSchema.fetchDiagram).not.toHaveBeenCalled();
		expect(wrapper.find('[data-testid="schema-close-button"]').exists()).toBe(false);
		expect(wrapper.text()).toContain('Create your first table');
	});

	it('emits schemaApplied from "Open tables"', async () => {
		tableSchema.generateSchemaChange.mockResolvedValue({
			batchId: 'b1',
			changes: [
				{ id: 'x', changeType: 'DROP_TABLE', targetTableName: 't', forwardSql: 'DROP TABLE t', aiSummary: null },
			],
		});
		tableSchema.previewDiagram.mockResolvedValue({ diagram: '' });
		tableSchema.approveBatch.mockResolvedValue({ batchId: 'b1', changes: [{ status: 'applied' }] });
		const wrapper = mountEditor({ showClose: true });
		await flushPromises();
		await wrapper.find('textarea').setValue('drop t');
		await wrapper.find('form').trigger('submit');
		await settle();
		expect(wrapper.find('[data-testid="schema-change-card"]').text()).toContain('Drop table');
		await wrapper.find('[data-testid="schema-approve-button"]').trigger('click');
		await flushPromises();
		await wrapper.find('[data-testid="schema-open-tables-button"]').trigger('click');
		expect(wrapper.emitted('schemaApplied')).toHaveLength(1);
	});
});
