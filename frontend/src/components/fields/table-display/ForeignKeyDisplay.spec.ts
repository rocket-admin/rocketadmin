import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockRelations } from '../stories.mocks';
import { COPIED_MESSAGE } from '../useFieldWidget';
import ForeignKeyDisplay from './ForeignKeyDisplay.vue';
import { cellText, setupCopy } from './testing';

const relations = mockRelations({ column_name: 'user_id', referenced_table_name: 'users' });

describe('ForeignKeyDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('shows the plain value without relations', () => {
		const wrapper = mount(ForeignKeyDisplay, { props: { value: '42' } });
		expect(cellText(wrapper)).toBe('42');
		expect(wrapper.find('.foreign-key-display__button').exists()).toBe(false);
	});

	it('shows a button with relations', () => {
		const wrapper = mount(ForeignKeyDisplay, { props: { value: '42', relations } });
		expect(wrapper.get('.foreign-key-display__button').text()).toBe('42');
	});

	it('shows a dash for null and undefined', () => {
		for (const value of [null, undefined]) {
			const wrapper = mount(ForeignKeyDisplay, { props: { value, relations } });
			expect(wrapper.find('.foreign-key-display__button').exists()).toBe(false);
			expect(cellText(wrapper)).toBe('—');
		}
	});

	it('shows the button for 0 and an empty string', () => {
		expect(
			mount(ForeignKeyDisplay, { props: { value: 0, relations } })
				.get('.foreign-key-display__button')
				.text(),
		).toBe('0');
		expect(
			mount(ForeignKeyDisplay, { props: { value: '', relations } })
				.find('.foreign-key-display__button')
				.exists(),
		).toBe(true);
	});

	it('marks the selected key', () => {
		const wrapper = mount(ForeignKeyDisplay, { props: { value: '1', relations, isSelected: true } });
		expect(wrapper.get('.foreign-key-display__button').classes()).toContain('foreign-key-display__button--selected');
	});

	it('emits foreignKeyClick without clicking the row', async () => {
		const { attachTo } = setupCopy();
		const rowClick = vi.fn();
		attachTo.addEventListener('click', rowClick);
		const wrapper = mount(ForeignKeyDisplay, { props: { value: 7, relations }, attachTo });
		await wrapper.get('.foreign-key-display__button').trigger('click');
		expect(wrapper.emitted('foreignKeyClick')).toEqual([[{ foreignKey: relations, value: 7 }]]);
		expect(rowClick).not.toHaveBeenCalled();
	});

	it('copies the value', async () => {
		const { attachTo, clickCopy } = setupCopy();
		const result = await clickCopy(mount(ForeignKeyDisplay, { props: { value: '42', relations }, attachTo }));
		expect(result).toEqual({ copied: ['42'], emitted: [[COPIED_MESSAGE]], rowClicked: false });
	});
});
