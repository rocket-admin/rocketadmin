import { mount } from '@vue/test-utils';
import { format } from 'date-fns';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPIED_MESSAGE } from '../useFieldWidget';
import DateDisplay from './DateDisplay.vue';
import { setupCopy, widget } from './testing';

const shown = (props: InstanceType<typeof DateDisplay>['$props']) =>
	mount(DateDisplay, { props }).get('.table-display-cell__value span');

describe('DateDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('formats a date far from now with P, and the full date as the tooltip', () => {
		const dateStr = '2023-04-29';
		const span = shown({ value: dateStr });
		expect(span.text()).toBe(format(new Date(dateStr), 'P'));
		expect(span.attributes('title')).toBe(format(new Date(dateStr), 'PPP'));
	});

	it('shows a dash for null', () => {
		const span = shown({ value: null });
		expect(span.text()).toBe('—');
		expect(span.attributes('title')).toBeUndefined();
	});

	it('shows "today" for a same-day date, keeping the full date tooltip', () => {
		const recent = new Date(Date.now() - 1000 * 60);
		const span = shown({ value: recent.toISOString(), widgetStructure: widget({ formatDistanceWithinHours: 48 }) });
		expect(span.text()).toBe('today');
		expect(span.attributes('title')).toBe(format(recent, 'PPP'));
	});

	it('shows a relative date for a recent non-today date (48h by default)', () => {
		const yesterdayNoon = new Date();
		yesterdayNoon.setDate(yesterdayNoon.getDate() - 1);
		yesterdayNoon.setHours(12, 0, 0, 0);
		expect(shown({ value: yesterdayNoon.toISOString() }).text()).toContain('ago');
	});

	it('shows an unparseable value as is', () => {
		expect(shown({ value: 'someday' }).text()).toBe('someday');
	});

	it('copies the formatted date', async () => {
		const { attachTo, clickCopy } = setupCopy();
		const result = await clickCopy(mount(DateDisplay, { props: { value: '2023-04-29' }, attachTo }));
		expect(result).toEqual({
			copied: [format(new Date('2023-04-29'), 'P')],
			emitted: [[COPIED_MESSAGE]],
			rowClicked: false,
		});
	});
});
