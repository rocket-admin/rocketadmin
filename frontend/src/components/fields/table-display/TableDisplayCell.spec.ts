import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TableDisplayCell from './TableDisplayCell.vue';

describe('TableDisplayCell', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('renders the slot and a labelled copy button', () => {
		const wrapper = mount(TableDisplayCell, { props: { copyLabel: 'Copy URL' }, slots: { default: 'hello' } });
		expect(wrapper.get('.table-display-cell__value').text()).toBe('hello');
		expect(wrapper.get('button').attributes('aria-label')).toBe('Copy URL');
	});

	it('emits copy without letting the click reach the row', async () => {
		const rowClick = vi.fn();
		const row = document.createElement('div');
		row.addEventListener('click', rowClick);
		document.body.appendChild(row);
		const wrapper = mount(TableDisplayCell, { attachTo: row });
		await wrapper.get('button').trigger('click');
		expect(wrapper.emitted('copy')).toHaveLength(1);
		expect(rowClick).not.toHaveBeenCalled();
	});

	it('hides the copy button when not copyable', () => {
		const wrapper = mount(TableDisplayCell, { props: { copyable: false } });
		expect(wrapper.find('button').exists()).toBe(false);
	});

	it('marks end alignment', () => {
		const wrapper = mount(TableDisplayCell, { props: { align: 'end' } });
		expect(wrapper.classes()).toContain('table-display-cell--align-end');
	});
});
