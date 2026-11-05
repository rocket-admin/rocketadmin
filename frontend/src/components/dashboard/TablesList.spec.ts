// Port of db-tables-list.component.spec.ts, extended to the sidebar's behaviour: links, search,
// folders and their dialogs, the collapsed rail.
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { vTooltip } from '@/components/ui';
import type { TableProperties } from '@/models/table';
import { useTableStateStore } from '@/stores/table-state';
import type { TableFolder } from '@/stores/tables';
import TablesList from './TablesList.vue';

const tables = vi.hoisted(() => ({ updateTablesFolders: vi.fn() }));
const uiSettings = vi.hoisted(() => ({ updateConnectionSetting: vi.fn() }));
const connections = vi.hoisted(() => ({ canEditConnection: true }));
const dialog = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock('@/stores/tables', () => ({ useTablesStore: () => tables }));
vi.mock('@/stores/ui-settings', () => ({ useUiSettingsStore: () => uiSettings }));
vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => connections }));
vi.mock('@/composables/useDialog', () => ({ useDialog: () => dialog }));

const permissions = { visibility: true, readonly: false, add: true, delete: true, edit: true };
const table = (name: string, normalizedTableName: string, initials: string): TableProperties => ({
	table: name,
	normalizedTableName,
	initials,
	permissions,
});
const allTables = [table('users', 'Users', 'U'), table('order_items', 'Order Items', 'OI')];

function folders(custom: TableFolder[] = []): TableFolder[] {
	return [{ category_id: 'all-tables-kitten', category_name: 'All tables', tables: allTables }, ...custom];
}

async function mountList(props: Partial<InstanceType<typeof TablesList>['$props']> = {}) {
	const pinia = createPinia();
	setActivePinia(pinia);
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
	});
	await router.push('/dashboard/conn/users');
	const wrapper = mount(TablesList, {
		props: { connectionID: 'conn', tableFolders: folders(), selectedTable: 'users', ...props },
		global: { plugins: [router, pinia], directives: { tooltip: vTooltip } },
		attachTo: document.body,
	});
	await flushPromises();
	return { wrapper, router };
}

describe('TablesList', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		connections.canEditConnection = true;
		tables.updateTablesFolders.mockResolvedValue([]);
	});

	it('should create with an empty "All tables" folder and say there are no tables', async () => {
		const { wrapper } = await mountList({
			tableFolders: [{ category_id: 'all-tables-kitten', category_name: 'All Tables', tables: [] }],
		});
		expect(wrapper.text()).toContain('No tables in this connection.');
		wrapper.unmount();
	});

	it('links every table to its first page and marks the open one', async () => {
		const { wrapper } = await mountList();
		const links = wrapper.findAll('a.tables-list__table-link');
		expect(links.map((link) => link.text())).toEqual(['Users', 'Order Items']);
		expect(links[0]?.attributes('href')).toBe('/dashboard/conn/users?page_index=0&page_size=30');
		expect(links[0]?.classes()).toContain('tables-list__table-link--active');
		wrapper.unmount();
	});

	it('closes the row preview and the AI panel when a table is opened', async () => {
		const { wrapper } = await mountList();
		const tableState = useTableStateStore();
		tableState.handleViewAIpanel();
		await wrapper.findAll('a.tables-list__table-link')[1]?.trigger('click');
		expect(tableState.aiPanelOpen).toBe(false);
		wrapper.unmount();
	});

	it('searches the tables and says when nothing is found', async () => {
		const { wrapper } = await mountList();
		const search = wrapper.find('input[name="search"]');
		await search.setValue('order');
		await search.trigger('keyup');
		expect(wrapper.findAll('a.tables-list__table-link').map((link) => link.text())).toEqual(['Order Items']);
		await search.setValue('zzz');
		await search.trigger('keyup');
		expect(wrapper.text()).toContain('Nothing found.');
		wrapper.unmount();
	});

	it('adds a folder for editors only', async () => {
		const { wrapper } = await mountList();
		const add = wrapper.findAll('button').find((button) => button.text().includes('Add folder'));
		await add?.trigger('click');
		expect(tables.updateTablesFolders).toHaveBeenCalledWith(
			'conn',
			expect.arrayContaining([expect.objectContaining({ category_name: 'Folder 1', tables: [] })]),
		);
		expect(wrapper.text()).toContain('Add or drag and drop tables');
		wrapper.unmount();

		connections.canEditConnection = false;
		const readonly = await mountList();
		expect(readonly.wrapper.findAll('button').some((button) => button.text().includes('Add folder'))).toBe(false);
		readonly.wrapper.unmount();
	});

	it('edits a folder through its dialog and saves the result', async () => {
		dialog.open.mockReturnValue({
			afterClosed: () =>
				Promise.resolve({ id: 'sales', name: 'Money', expanded: true, tableIds: ['users'], iconColor: '#2196F3' }),
		});
		const { wrapper } = await mountList({
			tableFolders: folders([
				{ category_id: 'sales', category_name: 'Sales', tables: [allTables[1] as TableProperties] },
			]),
			uiSettings: { shownTableTitles: true, tables: {}, tableFoldersExpanded: ['sales'] },
		});
		const edit = wrapper.findAll('[role="menuitem"]').find((item) => item.text().includes('Edit'));
		await edit?.trigger('click');
		await flushPromises();
		expect(dialog.open.mock.calls[0]?.[1]).toMatchObject({
			data: { folder: { id: 'sales', name: 'Sales', tableIds: ['order_items'] } },
		});
		expect(tables.updateTablesFolders).toHaveBeenCalledWith('conn', [
			expect.objectContaining({ category_id: 'all-tables-kitten' }),
			{ category_id: 'sales', category_name: 'Money', category_color: '#2196F3', tables: ['users'] },
		]);
		wrapper.unmount();
	});

	it('deletes a folder once confirmed', async () => {
		dialog.open.mockReturnValue({ afterClosed: () => Promise.resolve(true) });
		const { wrapper } = await mountList({
			tableFolders: folders([{ category_id: 'sales', category_name: 'Sales', tables: [] }]),
		});
		const remove = wrapper.findAll('[role="menuitem"]').find((item) => item.text().includes('Delete'));
		await remove?.trigger('click');
		await flushPromises();
		expect(dialog.open.mock.calls[0]?.[1]).toEqual({ data: { folderName: 'Sales', tableCount: 0 } });
		expect(tables.updateTablesFolders).toHaveBeenCalledWith('conn', [
			expect.objectContaining({ category_id: 'all-tables-kitten' }),
		]);
		wrapper.unmount();
	});

	it('remembers the expanded folders in the UI settings', async () => {
		const { wrapper } = await mountList({
			tableFolders: folders([{ category_id: 'sales', category_name: 'Sales', tables: [] }]),
			uiSettings: { shownTableTitles: true, tables: {}, tableFoldersExpanded: ['all-tables-kitten'] },
		});
		const toggles = wrapper.findAll('.tables-list__folder-toggle');
		expect(toggles.map((toggle) => toggle.attributes('aria-expanded'))).toEqual(['true', 'false']);
		await toggles[1]?.trigger('click');
		expect(uiSettings.updateConnectionSetting).toHaveBeenCalledWith('conn', 'tableFoldersExpanded', [
			'all-tables-kitten',
			'sales',
		]);
		wrapper.unmount();
	});

	it('shows the collapsed rail with initials and asks to expand for a search', async () => {
		const { wrapper } = await mountList();
		await wrapper.setProps({ collapsed: true });
		await wrapper.setProps({ collapsed: false });
		await wrapper.setProps({ collapsed: true });
		const initials = wrapper.findAll('a.tables-list__rail-table').map((link) => link.text());
		expect(initials).toEqual(['U', 'OI']);
		await wrapper.find('button[aria-label="Search"]').trigger('click');
		expect(wrapper.emitted('expandSidebar')).toHaveLength(1);
		wrapper.unmount();
	});
});
