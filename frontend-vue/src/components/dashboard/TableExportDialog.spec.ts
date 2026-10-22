import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DialogHost from '@/components/dialog/DialogHost.vue';
import { useDialog } from '@/composables/useDialog';
import { useTablesStore } from '@/stores/tables';
import TableExportDialog, { type TableExportDialogData } from './TableExportDialog.vue';

const analytics = vi.hoisted(() => ({ trackEvent: vi.fn(), capture: vi.fn() }));
vi.mock('@/composables/useAnalytics', () => ({ trackEvent: analytics.trackEvent }));
vi.mock('posthog-js', () => ({ default: { capture: analytics.capture } }));
const download = vi.hoisted(() => vi.fn());
vi.mock('./TableExportDialog.helpers', () => ({ downloadCsv: download }));

const data: TableExportDialogData = {
	connectionID: '12345678',
	tableName: 'users',
	sortColumn: 'first_name',
	sortOrder: 'ASC',
	filters: { first_name: { startswith: 'A' } },
	search: '',
};

function open(dialogData: TableExportDialogData = data) {
	const wrapper = mount(DialogHost, { attachTo: document.body });
	const ref = useDialog().open(TableExportDialog, { data: dialogData });
	return { wrapper, ref };
}

function button(wrapper: ReturnType<typeof mount>, label: string) {
	const match = wrapper.findAll('button').find((candidate) => candidate.text() === label);
	if (!match) throw new Error(`no button ${label}`);
	return match;
}

describe('TableExportDialog', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('exports everything (up to 100 000 rows) by default, downloads the CSV and closes', async () => {
		const exportCsv = vi.spyOn(useTablesStore(), 'exportTableCSV').mockResolvedValue('id\n1');
		const { wrapper, ref } = open();
		await flushPromises();

		expect(wrapper.find('input[name="records-number"]').attributes('disabled')).toBeDefined();
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(exportCsv).toHaveBeenCalledWith({ ...data, chunkSize: 100000 });
		expect(download).toHaveBeenCalledWith('id\n1');
		await expect(ref.afterClosed()).resolves.toBeUndefined();
		expect(analytics.trackEvent).toHaveBeenCalledWith('Dashboard: db export is successful');
		expect(analytics.capture).toHaveBeenCalledWith('Dashboard: db export is successful');
		wrapper.unmount();
	});

	it('exports the typed number of records', async () => {
		const exportCsv = vi.spyOn(useTablesStore(), 'exportTableCSV').mockResolvedValue('');
		const { wrapper } = open();
		await flushPromises();

		await wrapper.findAll('input[type="radio"]')[0]?.setValue(true);
		const number = wrapper.find('input[name="records-number"]');
		expect(number.attributes('disabled')).toBeUndefined();
		await number.setValue('25');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(exportCsv).toHaveBeenCalledWith(expect.objectContaining({ chunkSize: 25 }));
		wrapper.unmount();
	});

	it('drops an empty sort order (an unsorted table)', async () => {
		const exportCsv = vi.spyOn(useTablesStore(), 'exportTableCSV').mockResolvedValue('');
		const { wrapper } = open({ ...data, sortColumn: undefined, sortOrder: '' });
		await flushPromises();

		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(exportCsv).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: undefined }));
		wrapper.unmount();
	});

	it('stays open when the export fails', async () => {
		vi.spyOn(useTablesStore(), 'exportTableCSV').mockRejectedValue(new Error('boom'));
		const { wrapper } = open();
		await flushPromises();

		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(download).not.toHaveBeenCalled();
		expect(wrapper.find('form').exists()).toBe(true);
		expect(button(wrapper, 'Export').attributes('disabled')).toBeUndefined();
		wrapper.unmount();
	});
});
