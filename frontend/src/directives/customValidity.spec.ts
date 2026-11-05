import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, ref } from 'vue';
import { vCustomValidity } from './customValidity';

describe('vCustomValidity', () => {
	it('sets and clears the native validity message', async () => {
		const message = ref<string | null>('Invalid hex');
		const wrapper = mount(
			defineComponent({
				directives: { customValidity: vCustomValidity },
				setup: () => ({ message }),
				template: '<input v-custom-validity="message">',
			}),
		);
		const input = wrapper.find('input').element as HTMLInputElement;
		expect(input.validationMessage).toBe('Invalid hex');
		expect(input.checkValidity()).toBe(false);

		message.value = null;
		await wrapper.vm.$nextTick();
		expect(input.checkValidity()).toBe(true);
	});
});
