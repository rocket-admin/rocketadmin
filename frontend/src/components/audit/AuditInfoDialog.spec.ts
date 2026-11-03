import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import DialogHost from '@/components/dialog/DialogHost.vue';
import { useDialog } from '@/composables/useDialog';
import AuditInfoDialog from './AuditInfoDialog.vue';
import type { AuditLogDetails } from './useAuditLog';

const baseLog: AuditLogDetails = {
	Table: 'south_park_table',
	User: 'eric@cartman.ass',
	Status: 'successfully',
	operationType: 'addRow',
	createdAt: '2021-06-26T07:22:00.603Z',
	prevValue: null,
	currentValue: { firstName: 'Kenny', secondName: 'Kenny McCormick', status: 'poor' },
};

async function openDialog(log: Partial<AuditLogDetails>) {
	const wrapper = mount(DialogHost, { attachTo: document.body });
	const dialogRef = useDialog().open(AuditInfoDialog, { data: { ...baseLog, ...log } });
	await flushPromises();
	return { wrapper, dialogRef };
}

describe('AuditInfoDialog', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('describes who did what, where and when', async () => {
		const { wrapper } = await openDialog({});
		expect(wrapper.find('h2').text()).toBe('Log details');
		const preamble = wrapper.find('[data-block="preamble"]').text();
		expect(preamble).toContain('eric@cartman.ass added the row in "South Park Tables" table on');
		expect(preamble).toContain('2021');
		expect(preamble).toMatch(/successfully\.$/);
		wrapper.unmount();
	});

	it('words a failed action as an attempt', async () => {
		const { wrapper } = await openDialog({ Status: 'unsuccessfully', operationType: 'deleteRow' });
		expect(wrapper.find('[data-block="preamble"]').text()).toContain('attempted to delete the row');
		wrapper.unmount();
	});

	it.each([
		['added', 'addRow'],
		['deleted', 'deleteRow'],
		['viewed', 'rowReceived'],
	])('lists the values of a %s row', async (_name, operationType) => {
		const { wrapper } = await openDialog({ operationType });
		const table = wrapper.find('table[data-block="one-row-details"]');
		expect(table.exists()).toBe(true);
		expect(table.findAll('th').map((th) => th.text())).toEqual(['First name', 'Second name', 'Status']);
		expect(table.text()).toContain('Kenny McCormick');
		expect(wrapper.find('[data-block="comparison-details"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it('compares old and new values of an edited row and highlights the changed field', async () => {
		const { wrapper } = await openDialog({
			operationType: 'updateRow',
			prevValue: { firstName: 'Kenny', secondName: 'McCormick', status: 'poor' },
			currentValue: { firstName: 'Kenny', secondName: 'McCormick', status: 'poor and stupid' },
		});
		const comparison = wrapper.find('[data-block="comparison-details"]');
		expect(comparison.exists()).toBe(true);

		const changed = wrapper.find('[data-line="status-field"]');
		expect(changed.classes()).toContain('audit-info__row--changed');
		expect(changed.findAll('td').map((td) => td.text())).toEqual(['poor', 'poor and stupid']);
		expect(wrapper.find('[data-line="firstName-field"]').classes()).not.toContain('audit-info__row--changed');
		expect(wrapper.find('[data-line="secondName-field"]').classes()).not.toContain('audit-info__row--changed');
		wrapper.unmount();
	});

	it('lists the new values of an edited row when the old ones are unknown', async () => {
		const { wrapper } = await openDialog({ operationType: 'updateRow', prevValue: null });
		expect(wrapper.find('table[data-block="one-row-details"]').exists()).toBe(true);
		expect(wrapper.find('[data-block="comparison-details"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it('spans sensitive values over both columns', async () => {
		const { wrapper } = await openDialog({
			operationType: 'updateRow',
			prevValue: { name: 'Kenny', password: 'old' },
			currentValue: { name: 'Kyle', password: '* * * sensitive data, no logs stored * * *' },
		});
		const cells = wrapper.find('[data-line="password-field"]').findAll('td');
		expect(cells).toHaveLength(1);
		expect(cells[0]?.attributes('colspan')).toBe('2');
		expect(cells[0]?.classes()).toContain('audit-info__value--sensitive');
		wrapper.unmount();
	});

	it('closes on Ok', async () => {
		const { wrapper, dialogRef } = await openDialog({});
		const ok = wrapper.findAll('button').find((button) => button.text() === 'Ok');
		await ok?.trigger('click');
		await expect(dialogRef.afterClosed()).resolves.toBeUndefined();
		await flushPromises();
		expect(wrapper.find('h2').exists()).toBe(false);
		wrapper.unmount();
	});
});
