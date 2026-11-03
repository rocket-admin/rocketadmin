import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import IdFilter from './IdFilter.vue';

const UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('IdFilter', () => {
	it('renders the value with the test id', () => {
		const wrapper = mount(IdFilter, { props: { label: 'id', value: UUID } });
		expect((wrapper.find('[data-testid="record-id-id"]').element as HTMLInputElement).value).toBe(UUID);
	});

	it('emits every edit', async () => {
		const wrapper = mount(IdFilter, { props: { label: 'id' } });
		await wrapper.find('input').setValue('abc');
		expect(wrapper.emitted('fieldChange')).toEqual([['abc']]);
	});

	it('flags a value that is not a GUID once edited, and accepts braces', async () => {
		const wrapper = mount(IdFilter, { props: { label: 'id' } });
		const input = wrapper.find('input');
		await input.setValue('not-a-guid');
		expect(wrapper.text()).toContain("Value doesn't match pattern.");
		expect((input.element as HTMLInputElement).checkValidity()).toBe(false);

		await input.setValue(`{${UUID}}`);
		expect(wrapper.text()).not.toContain("Value doesn't match pattern.");
		expect((input.element as HTMLInputElement).checkValidity()).toBe(true);
	});
});
