import { mount } from '@vue/test-utils';
import { format } from 'date-fns';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPIED_MESSAGE } from '../useFieldWidget';
import DateTimeDisplay from './DateTimeDisplay.vue';
import { setupCopy, widget } from './testing';

const shown = (props: InstanceType<typeof DateTimeDisplay>['$props']) =>
	mount(DateTimeDisplay, { props }).get('.table-display-cell__value span');

describe('DateTimeDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('formats a datetime with "P p" and the full one as the tooltip', () => {
		const dateStr = '2023-04-29T10:30:00';
		const span = shown({ value: dateStr });
		expect(span.text()).toBe(format(new Date(dateStr), 'P p'));
		expect(span.attributes('title')).toBe(format(new Date(dateStr), 'PPpp'));
	});

	it('shows a dash for null', () => {
		expect(shown({ value: null }).text()).toBe('—');
	});

	it('is never relative by default', () => {
		const recent = new Date(Date.now() - 1000 * 60 * 5);
		expect(shown({ value: recent.toISOString() }).text()).toBe(format(recent, 'P p'));
	});

	it('is relative within formatDistanceWithinHours', () => {
		const recent = new Date(Date.now() - 1000 * 60 * 5);
		expect(
			shown({ value: recent.toISOString(), widgetStructure: widget({ formatDistanceWithinHours: 2 }) }).text(),
		).toBe('5 minutes ago');
	});

	it('copies the formatted datetime', async () => {
		const value = '2023-04-29T10:30:00';
		const { attachTo, clickCopy } = setupCopy();
		const result = await clickCopy(mount(DateTimeDisplay, { props: { value }, attachTo }));
		expect(result).toEqual({
			copied: [format(new Date(value), 'P p')],
			emitted: [[COPIED_MESSAGE]],
			rowClicked: false,
		});
	});
});
