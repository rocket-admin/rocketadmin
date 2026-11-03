import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import UiPaginator from './UiPaginator.vue';

function mountPaginator(props: Record<string, unknown> = {}) {
	return mount(UiPaginator, { props: { length: 95, pageSize: 30, pageIndex: 0, ...props } });
}

const button = (wrapper: ReturnType<typeof mountPaginator>, label: string) =>
	wrapper.get(`button[aria-label="${label}"]`);

describe('UiPaginator', () => {
	it("is a named group with Material's range label", () => {
		const wrapper = mountPaginator();

		expect(wrapper.attributes('role')).toBe('group');
		expect(wrapper.attributes('aria-label')).toBe('Pagination');
		expect(wrapper.get('.ui-paginator__range').text()).toBe('1 – 30 of 95');
		expect(wrapper.get('.ui-paginator__range').attributes('aria-live')).toBe('polite');
	});

	it.each([
		[{ pageIndex: 3 }, '91 – 95 of 95'],
		[{ length: 0 }, '0 of 0'],
		[{ pageSize: 0 }, '0 of 95'],
	])('labels %o as %s', (props, label) => {
		expect(mountPaginator(props).get('.ui-paginator__range').text()).toBe(label);
	});

	it('moves to the next and previous page, emitting a PageEvent', async () => {
		const wrapper = mountPaginator({ pageIndex: 1 });
		await button(wrapper, 'Next page').trigger('click');

		expect(wrapper.emitted('update:pageIndex')?.at(-1)).toEqual([2]);
		expect(wrapper.emitted('page')?.at(-1)).toEqual([{ pageIndex: 2, pageSize: 30, previousPageIndex: 1, length: 95 }]);

		const back = mountPaginator({ pageIndex: 1 });
		await button(back, 'Previous page').trigger('click');
		expect(back.emitted('update:pageIndex')?.at(-1)).toEqual([0]);
	});

	it('disables previous on the first page and next on the last', async () => {
		const wrapper = mountPaginator();
		expect(button(wrapper, 'Previous page').attributes('disabled')).toBeDefined();
		expect(button(wrapper, 'Next page').attributes('disabled')).toBeUndefined();

		await wrapper.setProps({ pageIndex: 3 });
		expect(button(wrapper, 'Next page').attributes('disabled')).toBeDefined();
	});

	it('shows first/last buttons only with showFirstLast', async () => {
		expect(mountPaginator().find('button[aria-label="First page"]').exists()).toBe(false);

		const wrapper = mountPaginator({ showFirstLast: true, pageIndex: 1 });
		await button(wrapper, 'Last page').trigger('click');
		expect(wrapper.emitted('update:pageIndex')?.at(-1)).toEqual([3]);
		await button(wrapper, 'First page').trigger('click');
		expect(wrapper.emitted('update:pageIndex')?.at(-1)).toEqual([0]);
	});

	it('hides the size picker without pageSizeOptions', () => {
		expect(mountPaginator().find('select').exists()).toBe(false);
	});

	it('offers the page sizes, including the current one, labelled by the visible text', () => {
		const wrapper = mountPaginator({ pageSizeOptions: [10, 50, 100] });
		const select = wrapper.get('select');

		expect(select.findAll('option').map((option) => option.text())).toEqual(['10', '30', '50', '100']);
		expect(wrapper.get(`#${select.attributes('aria-labelledby')}`).text()).toBe('Items per page:');
	});

	it('keeps the first visible item when the page size changes', async () => {
		const wrapper = mountPaginator({ length: 300, pageSizeOptions: [10, 30, 100], pageIndex: 3 });
		const select = wrapper.get('select');
		(select.element as HTMLSelectElement).selectedIndex = 0;
		await select.trigger('change');

		expect(wrapper.emitted('update:pageSize')?.at(-1)).toEqual([10]);
		// Item 91 was first on page 3 of 30; on pages of 10 it is on page 9.
		expect(wrapper.emitted('update:pageIndex')?.at(-1)).toEqual([9]);
		expect(wrapper.emitted('page')?.at(-1)).toEqual([
			{ pageIndex: 9, pageSize: 10, previousPageIndex: 3, length: 300 },
		]);
	});

	it('disables every control when disabled', () => {
		const wrapper = mountPaginator({ disabled: true, pageIndex: 1, pageSizeOptions: [10, 30] });

		expect(wrapper.findAll('button').every((b) => b.attributes('disabled') !== undefined)).toBe(true);
		expect(wrapper.get('select').attributes('disabled')).toBeDefined();
	});
});
