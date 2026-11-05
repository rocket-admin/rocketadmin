import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DateTimeFilter from './DateTimeFilter.vue';
import { pickComparator, selectedComparator } from './filterTestUtils';

const ISO_NO_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function byTestId(wrapper: ReturnType<typeof mount>, id: string) {
	return wrapper.find(`[data-testid="${id}"]`);
}

describe('DateTimeFilter', () => {
	afterEach(() => vi.useRealTimers());

	it('defaults to last day and emits that preset with gte on mount', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2024-03-10T12:00:00.123Z'));
		const wrapper = mount(DateTimeFilter, { props: { label: 'created' } });
		expect(selectedComparator(wrapper)).toBe('last day');
		expect(wrapper.emitted('fieldChange')).toEqual([['2024-03-09T12:00:00Z']]);
		expect(wrapper.emitted('comparatorChange')).toEqual([['gte']]);
		expect(wrapper.find('input').exists()).toBe(false);
	});

	it('restores a string value as gte with its date and time, and re-emits gte', () => {
		const wrapper = mount(DateTimeFilter, { props: { label: 'created', value: '2021-06-26T07:22:00.603' } });
		expect(selectedComparator(wrapper)).toBe('on or after');
		expect((byTestId(wrapper, 'record-created-date').element as HTMLInputElement).value).toBe('2021-06-26');
		expect((byTestId(wrapper, 'record-created-time').element as HTMLInputElement).value).toBe('07:22:00');
		expect(wrapper.emitted('comparatorChange')).toEqual([['gte']]);
		expect(wrapper.emitted('fieldChange')).toBeUndefined();
	});

	it('emits the date (with 00:00:00 when no time is set) and the mode', async () => {
		const wrapper = mount(DateTimeFilter, { props: { label: 'created' } });
		await pickComparator(wrapper, 'on');
		await byTestId(wrapper, 'record-created-date').setValue('2021-08-26');
		expect(wrapper.emitted('fieldChange')?.at(-1)).toEqual(['2021-08-26T00:00:00Z']);
		expect(wrapper.emitted('comparatorChange')?.at(-1)).toEqual(['eq']);
		expect((byTestId(wrapper, 'record-created-time').element as HTMLInputElement).value).toBe('00:00:00');
	});

	it('emits on a time change with the mode', async () => {
		const wrapper = mount(DateTimeFilter, { props: { label: 'created', value: '2021-07-26T08:00:00' } });
		await pickComparator(wrapper, 'before');
		await byTestId(wrapper, 'record-created-time').setValue('07:20:00');
		expect(wrapper.emitted('fieldChange')?.at(-1)).toEqual(['2021-07-26T07:20:00Z']);
		expect(wrapper.emitted('comparatorChange')?.at(-1)).toEqual(['lt']);
	});

	it('emits gte and a computed UTC value for each preset', async () => {
		const wrapper = mount(DateTimeFilter, { props: { label: 'created', value: '2021-07-26T08:00:00' } });
		await pickComparator(wrapper, 'last hour');
		expect(wrapper.emitted('comparatorChange')?.at(-1)).toEqual(['gte']);
		expect(wrapper.emitted('fieldChange')?.at(-1)?.[0]).toMatch(ISO_NO_MS);
	});

	it('re-emits the existing datetime when switching to a custom mode', async () => {
		const wrapper = mount(DateTimeFilter, { props: { label: 'created', value: '2021-08-26T10:00:00' } });
		await pickComparator(wrapper, 'after');
		expect(wrapper.emitted('comparatorChange')?.at(-1)).toEqual(['gt']);
		expect(wrapper.emitted('fieldChange')?.at(-1)).toEqual(['2021-08-26T10:00:00Z']);
	});

	it('emits [lower, upper] with between, null for a missing bound', async () => {
		const wrapper = mount(DateTimeFilter, { props: { label: 'created' } });
		await pickComparator(wrapper, 'between');
		expect(wrapper.emitted('fieldChange')?.at(-1)).toEqual([undefined]);
		expect(wrapper.emitted('comparatorChange')?.at(-1)).toEqual(['between']);

		const inputs = wrapper.findAll('input');
		await inputs[0]?.setValue('2024-01-01');
		expect(wrapper.emitted('fieldChange')?.at(-1)).toEqual([['2024-01-01T00:00:00Z', null]]);
		await inputs[2]?.setValue('2024-01-31');
		await inputs[3]?.setValue('23:59:59');
		expect(wrapper.emitted('fieldChange')?.at(-1)).toEqual([['2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z']]);
		expect(wrapper.emitted('comparatorChange')?.at(-1)).toEqual(['between']);
	});

	it('parses comma-separated datetimes with in, undefined when empty', async () => {
		const wrapper = mount(DateTimeFilter, { props: { label: 'created' } });
		await pickComparator(wrapper, 'in');
		await wrapper.find('input').setValue('2024-01-01T00:00:00Z, 2024-02-01T00:00:00Z');
		expect(wrapper.emitted('fieldChange')?.at(-1)).toEqual([['2024-01-01T00:00:00Z', '2024-02-01T00:00:00Z']]);
		expect(wrapper.emitted('comparatorChange')?.at(-1)).toEqual(['in']);
		await wrapper.find('input').setValue('   ');
		expect(wrapper.emitted('fieldChange')?.at(-1)).toEqual([undefined]);
	});

	it('restores between and in from the stored comparator', () => {
		const between = mount(DateTimeFilter, {
			props: { label: 'created', comparator: 'between', value: ['2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z'] },
		});
		expect(selectedComparator(between)).toBe('between');
		expect(between.findAll('input').map((i) => (i.element as HTMLInputElement).value)).toEqual([
			'2024-01-01',
			'00:00:00',
			'2024-01-31',
			'23:59:59',
		]);
		expect(between.emitted('comparatorChange')).toEqual([['between']]);

		const inMode = mount(DateTimeFilter, {
			props: { label: 'created', comparator: 'in', value: ['2024-01-01T00:00:00Z', '2024-02-01T00:00:00Z'] },
		});
		expect((inMode.find('input').element as HTMLInputElement).value).toBe('2024-01-01T00:00:00Z, 2024-02-01T00:00:00Z');
		expect(inMode.emitted('comparatorChange')).toEqual([['in']]);
	});
});
