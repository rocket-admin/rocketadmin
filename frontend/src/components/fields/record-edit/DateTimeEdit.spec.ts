import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { DBtype } from '@/models/connection';
import { useConnectionsStore } from '@/stores/connections';
import DateTimeEdit from './DateTimeEdit.vue';

const field = (wrapper: ReturnType<typeof mount>, kind: 'date' | 'time') =>
	wrapper.find(`[data-testid="record-created_at-${kind}"]`);

describe('DateTimeEdit', () => {
	beforeEach(() => setActivePinia(createPinia()));

	function mountWith(type: DBtype, value: string | null = '2021-07-26T07:20:00') {
		useConnectionsStore().connection.type = type;
		return mount(DateTimeEdit, { props: { label: 'created_at', value } });
	}

	it('splits the value into date and time inputs', () => {
		const wrapper = mountWith(DBtype.Postgres, '2021-06-26T07:22:00.603');
		expect((field(wrapper, 'date').element as HTMLInputElement).value).toBe('2021-06-26');
		expect((field(wrapper, 'time').element as HTMLInputElement).value).toBe('07:22:00');
		expect(wrapper.text()).toContain('Created at (date)');
		expect(wrapper.text()).toContain('Created at (time)');
	});

	it('emits an ISO timestamp for a non-MySQL database', async () => {
		const wrapper = mountWith(DBtype.Postgres);
		await field(wrapper, 'date').setValue('2021-08-26');
		await field(wrapper, 'time').setValue('07:22:00');
		expect(wrapper.emitted('fieldChange')).toEqual([['2021-08-26T07:20:00Z'], ['2021-08-26T07:22:00Z']]);
	});

	it('emits a space-separated timestamp for MySQL', async () => {
		const wrapper = mountWith(DBtype.MySQL);
		await field(wrapper, 'date').setValue('2021-08-26');
		await field(wrapper, 'time').setValue('07:22:00');
		expect(wrapper.emitted('fieldChange')).toEqual([['2021-08-26 07:20:00'], ['2021-08-26 07:22:00']]);
	});

	it('uses midnight when a date is picked with no time', async () => {
		const wrapper = mountWith(DBtype.Postgres, null);
		await field(wrapper, 'date').setValue('2021-08-26');
		expect(wrapper.emitted('fieldChange')).toEqual([['2021-08-26T00:00:00Z']]);
		expect((field(wrapper, 'time').element as HTMLInputElement).value).toBe('00:00:00');
	});
});
