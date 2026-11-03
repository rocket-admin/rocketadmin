import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { mockWidgetStructure } from '../stories.mocks';
import BinaryEdit from './BinaryEdit.vue';

const textarea = (wrapper: ReturnType<typeof mount>) => wrapper.find('textarea').element as HTMLTextAreaElement;

describe('BinaryEdit', () => {
	it('labels the field with its encoding', () => {
		const wrapper = mount(BinaryEdit, { props: { label: 'payload' } });
		expect(wrapper.find('label').text()).toContain('Payload (hex)');
	});

	it('shows a server string as char-code-per-byte hex without emitting', () => {
		const wrapper = mount(BinaryEdit, { props: { label: 'payload', value: 'Hello' } });
		expect(textarea(wrapper).value).toBe('48656c6c6f');
		expect(wrapper.emitted('fieldChange')).toBeUndefined();
	});

	it('shows Buffer-JSON as hex', () => {
		const wrapper = mount(BinaryEdit, {
			props: { label: 'payload', value: { type: 'Buffer', data: [0x48, 0x65, 0x6c] } },
		});
		expect(textarea(wrapper).value).toBe('48656c');
	});

	it('shows null as empty', () => {
		const wrapper = mount(BinaryEdit, { props: { label: 'payload', value: null } });
		expect(textarea(wrapper).value).toBe('');
	});

	it('emits Buffer-JSON for valid hex', async () => {
		const wrapper = mount(BinaryEdit, { props: { label: 'payload' } });
		await wrapper.find('textarea').setValue('48656c6c6f');
		expect(wrapper.emitted('fieldChange')).toEqual([[{ type: 'Buffer', data: [0x48, 0x65, 0x6c, 0x6c, 0x6f] }]]);
		expect(textarea(wrapper).checkValidity()).toBe(true);
	});

	it('emits null when cleared', async () => {
		const wrapper = mount(BinaryEdit, { props: { label: 'payload', value: 'Hi' } });
		await wrapper.find('textarea').setValue('');
		expect(wrapper.emitted('fieldChange')).toEqual([[null]]);
	});

	it('emits the raw string and shows an error for malformed hex', async () => {
		const wrapper = mount(BinaryEdit, { props: { label: 'payload' } });
		await wrapper.find('textarea').setValue('zz');
		expect(wrapper.emitted('fieldChange')).toEqual([['zz']]);
		expect(wrapper.text()).toContain('Invalid hex.');
		expect(textarea(wrapper).checkValidity()).toBe(false);
	});

	describe('encoding param', () => {
		it('seeds and emits base64', async () => {
			const wrapper = mount(BinaryEdit, {
				props: {
					label: 'payload',
					widgetStructure: mockWidgetStructure({ encoding: 'base64' }),
					value: { type: 'Buffer', data: [0x48, 0x65, 0x6c, 0x6c, 0x6f] },
				},
			});
			expect(wrapper.find('label').text()).toContain('(base64)');
			expect(textarea(wrapper).value).toBe('SGVsbG8=');
			await wrapper.find('textarea').setValue('SGk=');
			expect(wrapper.emitted('fieldChange')).toEqual([[{ type: 'Buffer', data: [0x48, 0x69] }]]);
		});

		it('emits the raw string for malformed base64', async () => {
			const wrapper = mount(BinaryEdit, {
				props: { label: 'payload', widgetStructure: mockWidgetStructure({ encoding: 'base64' }) },
			});
			await wrapper.find('textarea').setValue('!!!bad!!!');
			expect(wrapper.emitted('fieldChange')).toEqual([['!!!bad!!!']]);
			expect(wrapper.text()).toContain('Invalid base64.');
		});

		it('seeds ascii with non-printable bytes replaced and always emits Buffer-JSON', async () => {
			const wrapper = mount(BinaryEdit, {
				props: {
					label: 'payload',
					widgetStructure: mockWidgetStructure({ encoding: 'ascii' }),
					value: { type: 'Buffer', data: [0x48, 0x00, 0x69] },
				},
			});
			expect(textarea(wrapper).value).toBe('H.i');
			await wrapper.find('textarea').setValue('Hi');
			expect(wrapper.emitted('fieldChange')).toEqual([[{ type: 'Buffer', data: [0x48, 0x69] }]]);
		});

		it('falls back to hex for an unknown encoding', () => {
			const wrapper = mount(BinaryEdit, {
				props: { label: 'payload', widgetStructure: mockWidgetStructure({ encoding: 'utf8' }) },
			});
			expect(wrapper.find('label').text()).toContain('(hex)');
		});
	});
});
