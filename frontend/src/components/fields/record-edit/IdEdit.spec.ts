import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import IdEdit from './IdEdit.vue';

describe('IdEdit', () => {
	it('renders the label and the value', () => {
		const wrapper = mount(IdEdit, { props: { label: 'user_id', value: 'abc' } });
		expect(wrapper.find('label').text()).toContain('User ID');
		expect((wrapper.find('[data-testid="record-user_id-id"]').element as HTMLInputElement).value).toBe('abc');
	});

	it('emits the typed value', async () => {
		const wrapper = mount(IdEdit, { props: { label: 'id' } });
		await wrapper.find('input').setValue('7c9e6679-7425-40de-944b-e07fc1f90ae7');
		expect(wrapper.emitted('fieldChange')).toEqual([['7c9e6679-7425-40de-944b-e07fc1f90ae7']]);
		expect(wrapper.text()).not.toContain("doesn't match");
	});

	it('accepts a braced GUID', async () => {
		const wrapper = mount(IdEdit, { props: { label: 'id' } });
		await wrapper.find('input').setValue('{7C9E6679-7425-40DE-944B-E07FC1F90AE7}');
		expect(wrapper.text()).not.toContain("doesn't match");
	});

	it('shows the pattern error for a malformed id', async () => {
		const wrapper = mount(IdEdit, { props: { label: 'id' } });
		await wrapper.find('input').setValue('not-a-guid');
		expect(wrapper.text()).toContain("Value doesn't match pattern.");
		expect(wrapper.find('input').attributes('pattern')).toBeTruthy();
	});
});
