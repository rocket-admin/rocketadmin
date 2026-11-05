import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DialogHost from '@/components/dialog/DialogHost.vue';
import { useDialog } from '@/composables/useDialog';
import { useTablesStore } from '@/stores/tables';
import TableImportDialog, { type TableImportDialogData } from './TableImportDialog.vue';

const analytics = vi.hoisted(() => ({ trackEvent: vi.fn(), capture: vi.fn() }));
vi.mock('@/composables/useAnalytics', () => ({ trackEvent: analytics.trackEvent }));
vi.mock('posthog-js', () => ({ default: { capture: analytics.capture } }));

const data: TableImportDialogData = { connectionID: '12345678', tableName: 'users', isTestConnection: false };

function open(dialogData: TableImportDialogData = data) {
	const wrapper = mount(DialogHost, { attachTo: document.body });
	const ref = useDialog().open(TableImportDialog, { data: dialogData });
	return { wrapper, ref };
}

async function pickFile(wrapper: ReturnType<typeof mount>, file: File) {
	const input = wrapper.find('input[type="file"]');
	Object.defineProperty(input.element, 'files', { value: [file], configurable: true });
	await input.trigger('change');
}

describe('TableImportDialog', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('shows the picked file name', async () => {
		const { wrapper } = open();
		await flushPromises();

		expect(wrapper.text()).toContain('No file selected.');
		await pickFile(wrapper, new File(['id\n1'], 'users.csv', { type: 'text/csv' }));
		expect(wrapper.text()).toContain('users.csv');
		wrapper.unmount();
	});

	it('imports the file into the table and closes', async () => {
		const importCsv = vi.spyOn(useTablesStore(), 'importTableCSV').mockResolvedValue({});
		const { wrapper, ref } = open();
		await flushPromises();

		const file = new File(['id\n1'], 'users.csv', { type: 'text/csv' });
		await pickFile(wrapper, file);
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(importCsv).toHaveBeenCalledWith('12345678', 'users', file);
		await expect(ref.afterClosed()).resolves.toBeUndefined();
		expect(analytics.trackEvent).toHaveBeenCalledWith('Dashboard: db import is successful');
		expect(analytics.capture).toHaveBeenCalledWith('Dashboard: db import is successful');
		wrapper.unmount();
	});

	it('stays open when the import fails', async () => {
		vi.spyOn(useTablesStore(), 'importTableCSV').mockRejectedValue(new Error('boom'));
		const { wrapper } = open();
		await flushPromises();

		await pickFile(wrapper, new File(['x'], 'bad.csv'));
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(wrapper.find('form').exists()).toBe(true);
		expect(analytics.trackEvent).not.toHaveBeenCalled();
		wrapper.unmount();
	});

	it('does not post without a file', async () => {
		const importCsv = vi.spyOn(useTablesStore(), 'importTableCSV');
		const { wrapper } = open();
		await flushPromises();

		await wrapper.find('form').trigger('submit');
		expect(importCsv).not.toHaveBeenCalled();
		wrapper.unmount();
	});

	it('warns on a test connection', async () => {
		const { wrapper } = open({ ...data, isTestConnection: true });
		await flushPromises();

		expect(wrapper.text()).toContain('This is a TEST DATABASE, public to all. Avoid importing sensitive data!');
		wrapper.unmount();
	});
});
