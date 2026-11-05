// FolderDeleteDialog, FolderEditDialog, BulkActionConfirmationDialog and ActionLinkDialog, opened
// through useDialog as the table browser opens them.
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import DialogHost from '@/components/dialog/DialogHost.vue';
import { useDialog } from '@/composables/useDialog';
import type { Folder } from '@/composables/useTableFolders';
import ActionLinkDialog from './ActionLinkDialog.vue';
import BulkActionConfirmationDialog from './BulkActionConfirmationDialog.vue';
import FolderDeleteDialog from './FolderDeleteDialog.vue';
import FolderEditDialog from './FolderEditDialog.vue';
import { FOLDER_ICON_COLORS } from './folderColors';

const tables = vi.hoisted(() => ({ currentTableName: 'users', activateActions: vi.fn(), bulkDelete: vi.fn() }));
const tableRow = vi.hoisted(() => ({ deleteTableRow: vi.fn() }));
vi.mock('@/stores/tables', () => ({ useTablesStore: () => tables }));
vi.mock('@/stores/table-row', () => ({ useTableRowStore: () => tableRow }));
vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => ({ currentConnectionID: '12345678' }) }));

async function open(component: Parameters<ReturnType<typeof useDialog>['open']>[0], data: unknown) {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [{ path: '/:p(.*)*', component: { render: () => null } }],
	});
	const wrapper = mount(DialogHost, { attachTo: document.body, global: { plugins: [router] } });
	const dialogRef = useDialog().open(component, { data });
	await flushPromises();
	return { wrapper, dialogRef };
}

function button(wrapper: Awaited<ReturnType<typeof open>>['wrapper'], label: string) {
	const match = wrapper.findAll('button').find((candidate) => candidate.text() === label);
	if (!match) throw new Error(`No button "${label}"`);
	return match;
}

describe('table browser dialogs', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	describe('FolderDeleteDialog', () => {
		it('names the folder and its tables, and closes with true on delete', async () => {
			const { wrapper, dialogRef } = await open(FolderDeleteDialog, { folderName: 'Sales', tableCount: 2 });
			expect(wrapper.text()).toContain('Are you sure you want to delete the folder "Sales"?');
			expect(wrapper.text()).toContain('This folder contains 2 tables.');
			await button(wrapper, 'Delete folder').trigger('click');
			await expect(dialogRef.afterClosed()).resolves.toBe(true);
			wrapper.unmount();
		});

		it('closes with false on cancel and hides the info for an empty folder', async () => {
			const { wrapper, dialogRef } = await open(FolderDeleteDialog, { folderName: 'Empty', tableCount: 0 });
			expect(wrapper.text()).not.toContain('This folder contains');
			await button(wrapper, 'Cancel').trigger('click');
			await expect(dialogRef.afterClosed()).resolves.toBe(false);
			wrapper.unmount();
		});
	});

	describe('FolderEditDialog', () => {
		const folder: Folder = { id: 'f1', name: 'Sales', expanded: true, tableIds: ['orders'], isEmpty: false };
		const permissions = { visibility: true, readonly: false, add: true, delete: true, edit: true };
		const data = () => ({
			folder: { ...folder, tableIds: [...folder.tableIds] },
			tables: [
				{ table: 'orders', permissions },
				{ table: 'users', display_name: 'People', permissions },
			],
			folderIconColors: FOLDER_ICON_COLORS,
		});

		it('saves the renamed folder with its new tables and colour, on a copy', async () => {
			const input = data();
			const { wrapper, dialogRef } = await open(FolderEditDialog, input);
			await wrapper.find('input[name="folderName"]').setValue('  Money  ');
			await button(wrapper, 'Add').trigger('click');
			await button(wrapper, 'Remove').trigger('click');
			await wrapper.find('input[aria-label="Blue"]').setValue(true);
			await wrapper.find('form').trigger('submit');
			await expect(dialogRef.afterClosed()).resolves.toEqual({
				id: 'f1',
				name: 'Money',
				expanded: true,
				tableIds: ['users'],
				isEmpty: false,
				iconColor: '#2196F3',
			});
			expect(input.folder.tableIds).toEqual(['orders']);
			wrapper.unmount();
		});

		it('defaults the colour and refuses an empty name', async () => {
			const { wrapper, dialogRef } = await open(FolderEditDialog, data());
			expect(wrapper.find('.folder-edit__swatch-label--selected').exists()).toBe(false);
			await wrapper.find('input[name="folderName"]').setValue('   ');
			await wrapper.find('form').trigger('submit');
			await flushPromises();
			expect(wrapper.text()).toContain('Folder name is required');
			await button(wrapper, 'Cancel').trigger('click');
			await expect(dialogRef.afterClosed()).resolves.toBeUndefined();
			wrapper.unmount();
		});
	});

	describe('BulkActionConfirmationDialog', () => {
		it('lists the primary keys and deletes several rows in bulk', async () => {
			tables.bulkDelete.mockResolvedValue({});
			const primaryKeys = [{ id: 1 }, { id: 2 }, { id: 3 }];
			const { wrapper, dialogRef } = await open(BulkActionConfirmationDialog, {
				title: 'Delete rows',
				primaryKeys,
				tableDisplayName: 'Users',
			});
			expect(wrapper.find('h2').text()).toBe('Confirm delete rows for Users table');
			expect(wrapper.text()).toContain('id = 1');
			await button(wrapper, 'Delete rows').trigger('click');
			await flushPromises();
			expect(tables.bulkDelete).toHaveBeenCalledWith('12345678', 'users', primaryKeys);
			await expect(dialogRef.afterClosed()).resolves.toBe(true);
			wrapper.unmount();
		});

		it('deletes a single row through the row endpoint and lists identity values', async () => {
			tableRow.deleteTableRow.mockResolvedValue(undefined);
			const { wrapper } = await open(BulkActionConfirmationDialog, {
				title: 'Delete row',
				primaryKeys: [{ id: 7 }],
				identityFieldValues: ['Kenny'],
				tableDisplayName: 'Users',
			});
			expect(wrapper.text()).toContain('Kenny.');
			await button(wrapper, 'Delete row').trigger('click');
			await flushPromises();
			expect(tableRow.deleteTableRow).toHaveBeenCalledWith('12345678', 'users', { id: 7 });
			expect(tables.bulkDelete).not.toHaveBeenCalled();
			wrapper.unmount();
		});

		it('activates a custom action and offers the location it answers with', async () => {
			tables.activateActions.mockResolvedValue({ location: 'https://example.com/go' });
			const { wrapper } = await open(BulkActionConfirmationDialog, {
				id: 'action-1',
				title: 'Send email',
				primaryKeys: [{ id: 7 }],
				tableDisplayName: 'Users',
			});
			await button(wrapper, 'Send email').trigger('click');
			await flushPromises();
			expect(tables.activateActions).toHaveBeenCalledWith('12345678', 'users', 'action-1', 'Send email', [{ id: 7 }]);
			const link = wrapper.find('a.action-link');
			expect(link.attributes('href')).toBe('https://example.com/go');
			expect(link.text()).toContain('Take action Send email for');
			expect(link.text()).toContain('id = 7');
			wrapper.unmount();
		});
	});

	describe('ActionLinkDialog', () => {
		it('names the identity value when there is one and closes when followed', async () => {
			const { wrapper, dialogRef } = await open(ActionLinkDialog, {
				href: 'https://example.com',
				actionName: 'Ping',
				primaryKeys: { id: 1 },
				identityFieldValue: 'Kenny',
			});
			const link = wrapper.find('a.action-link');
			expect(link.text()).toContain('Kenny');
			expect(link.attributes('target')).toBe('_blank');
			link.element.addEventListener('click', (event) => event.preventDefault());
			await link.trigger('click');
			await expect(dialogRef.afterClosed()).resolves.toBeUndefined();
			wrapper.unmount();
		});
	});
});
