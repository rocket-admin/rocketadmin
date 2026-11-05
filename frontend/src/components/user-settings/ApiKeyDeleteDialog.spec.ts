import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ApiKeyDeleteDialog from './ApiKeyDeleteDialog.vue';
import { buttonByText, isOpen, openDialog } from './dialogTestUtils';

const store = vi.hoisted(() => ({ deleteAPIkey: vi.fn() }));
vi.mock('@/stores/user', () => ({ useUserStore: () => store }));

let wrapper: VueWrapper;
const apiKey = { id: 'key-1', title: 'CI key' };

describe('ApiKeyDeleteDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		store.deleteAPIkey.mockResolvedValue({});
	});

	afterEach(() => wrapper.unmount());

	it('deletes the key and closes with "delete"', async () => {
		const opened = await openDialog<'delete'>(ApiKeyDeleteDialog, apiKey);
		wrapper = opened.wrapper;
		expect(wrapper.find('h2').text()).toBe('Confirm API key delete');
		expect(wrapper.find('strong').text()).toBe('CI key');

		await buttonByText(wrapper, 'Delete').trigger('click');
		await flushPromises();

		expect(store.deleteAPIkey).toHaveBeenCalledWith(apiKey);
		await expect(opened.dialogRef.afterClosed()).resolves.toBe('delete');
		expect(isOpen(wrapper)).toBe(false);
	});

	it('closes with no result on Cancel', async () => {
		const opened = await openDialog<'delete'>(ApiKeyDeleteDialog, apiKey);
		wrapper = opened.wrapper;
		await buttonByText(wrapper, 'Cancel').trigger('click');

		await expect(opened.dialogRef.afterClosed()).resolves.toBeUndefined();
		expect(store.deleteAPIkey).not.toHaveBeenCalled();
	});

	it('stays open when the delete fails', async () => {
		store.deleteAPIkey.mockRejectedValue(new Error('nope'));
		const opened = await openDialog<'delete'>(ApiKeyDeleteDialog, apiKey);
		wrapper = opened.wrapper;
		await buttonByText(wrapper, 'Delete').trigger('click');
		await flushPromises();

		expect(isOpen(wrapper)).toBe(true);
	});
});
