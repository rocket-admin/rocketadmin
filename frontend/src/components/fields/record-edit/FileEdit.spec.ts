import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { mockWidgetStructure } from '../stories.mocks';
import FileEdit from './FileEdit.vue';

const radio = (wrapper: ReturnType<typeof mount>, index: number) => wrapper.findAll('input[type="radio"]')[index];

describe('FileEdit', () => {
	it('defaults to hex and shows the value', () => {
		const wrapper = mount(FileEdit, { props: { label: 'attachment', value: '48656c6c6f' } });
		expect(wrapper.find('textarea').element.value).toBe('48656c6c6f');
		expect((radio(wrapper, 0)?.element as HTMLInputElement).checked).toBe(true);
		expect(wrapper.text()).toContain('Attachment');
	});

	it('emits typed hex and shows an error for malformed hex', async () => {
		const wrapper = mount(FileEdit, { props: { label: 'attachment' } });
		await wrapper.find('textarea').setValue('48656c6c6f');
		expect(wrapper.emitted('fieldChange')).toEqual([['48656c6c6f']]);
		await wrapper.find('textarea').setValue('zz');
		expect(wrapper.text()).toContain('Invalid hex.');
		expect((radio(wrapper, 1)?.element as HTMLInputElement).disabled).toBe(true);
	});

	it('converts hex to base64 when switching to Base64', async () => {
		const wrapper = mount(FileEdit, { props: { label: 'attachment', value: '48656c6c6f' } });
		await radio(wrapper, 1)?.setValue(true);
		expect(wrapper.find('textarea').element.value).toBe('SGVsbG8=');
	});

	it('emits base64 input converted to hex', async () => {
		const wrapper = mount(FileEdit, { props: { label: 'attachment', value: '00' } });
		await radio(wrapper, 1)?.setValue(true);
		await wrapper.find('textarea').setValue('SGVsbG8=');
		expect(wrapper.emitted('fieldChange')).toEqual([['48656c6c6f']]);
	});

	it('locks the switcher and shows an error on invalid base64', async () => {
		const wrapper = mount(FileEdit, { props: { label: 'attachment', value: '00' } });
		await radio(wrapper, 1)?.setValue(true);
		await wrapper.find('textarea').setValue('!!!invalid!!!');
		expect(wrapper.text()).toContain('Invalid base64.');
		expect((radio(wrapper, 0)?.element as HTMLInputElement).disabled).toBe(true);
	});

	it('uses the fixed type from widget params instead of the switcher', () => {
		const wrapper = mount(FileEdit, {
			props: { label: 'attachment', value: 'SGVsbG8=', widgetStructure: mockWidgetStructure({ type: 'base64' }) },
		});
		expect(wrapper.find('input[type="radio"]').exists()).toBe(false);
		expect(wrapper.text()).toContain('base64');
		expect(wrapper.find('textarea').element.value).toBe('SGVsbG8=');
	});

	it('shows only an error for a fixed-type value that does not parse', () => {
		const wrapper = mount(FileEdit, {
			props: { label: 'attachment', value: 'xyz', widgetStructure: mockWidgetStructure({ type: 'hex' }) },
		});
		expect(wrapper.text()).toContain('Invalid hex format.');
		expect(wrapper.find('textarea').exists()).toBe(false);
	});

	it('emits an uploaded file as hex', async () => {
		const wrapper = mount(FileEdit, {
			props: { label: 'attachment', widgetStructure: mockWidgetStructure({ type: 'file' }) },
		});
		expect(wrapper.text()).toContain('No file uploaded yet.');
		const input = wrapper.find('input[type="file"]');
		Object.defineProperty(input.element, 'files', { value: [new File([new Uint8Array([0x48, 0x69])], 'a.bin')] });
		await input.trigger('change');
		await new Promise((resolve) => setTimeout(resolve, 20));
		await flushPromises();
		expect(wrapper.emitted('fieldChange')).toEqual([['4869']]);
		expect(wrapper.text()).toContain('File is uploaded.');
	});
});
