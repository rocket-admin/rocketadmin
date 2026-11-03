import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockWidgetStructure } from '../stories.mocks';
import BinaryRecordView from './BinaryRecordView.vue';

const valueText = (wrapper: ReturnType<typeof mount>) => wrapper.find('.binary-record-view__value').text();

describe('BinaryRecordView', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('shows a dash and no copy button when empty', () => {
		const wrapper = mount(BinaryRecordView, { props: { value: null } });
		expect(valueText(wrapper)).toBe('—');
		expect(wrapper.find('button').exists()).toBe(false);
	});

	it('encodes a server string as char-code-per-byte hex', () => {
		expect(valueText(mount(BinaryRecordView, { props: { value: 'Hel' } }))).toBe('48656c');
	});

	it('encodes a Buffer-JSON value', () => {
		const wrapper = mount(BinaryRecordView, { props: { value: { type: 'Buffer', data: [0x48, 0x65, 0x6c] } } });
		expect(valueText(wrapper)).toBe('48656c');
	});

	it('truncates long values with an ellipsis and puts the full text in the title', () => {
		const wrapper = mount(BinaryRecordView, { props: { value: 'ª'.repeat(50) } });
		const value = wrapper.find('.binary-record-view__value');
		expect(value.text()).toBe(`${'aa'.repeat(40)}…`);
		expect(value.attributes('title')).toBe('aa'.repeat(50));
	});

	it('renders base64 and ascii encodings', () => {
		expect(
			valueText(
				mount(BinaryRecordView, {
					props: { value: 'Hello', widgetStructure: mockWidgetStructure({ encoding: 'base64' }) },
				}),
			),
		).toBe('SGVsbG8=');
		expect(
			valueText(
				mount(BinaryRecordView, {
					props: {
						value: { type: 'Buffer', data: [0x48, 0x00, 0x69] },
						widgetStructure: mockWidgetStructure({ encoding: 'ascii' }),
					},
				}),
			),
		).toBe('H.i');
	});

	it('falls back to hex for an unknown encoding', () => {
		const wrapper = mount(BinaryRecordView, {
			props: { value: 'Hi', widgetStructure: mockWidgetStructure({ encoding: 'rot13' }) },
		});
		expect(valueText(wrapper)).toBe('4869');
		expect(wrapper.find('button').attributes('aria-label')).toBe('Copy hex');
	});

	it('copies the full encoded value and emits the snackbar message', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal('navigator', { clipboard: { writeText } });
		const wrapper = mount(BinaryRecordView, { props: { value: 'Hi' } });
		await wrapper.find('button').trigger('click');
		await flushPromises();
		expect(writeText).toHaveBeenCalledWith('4869');
		expect(wrapper.emitted('copyToClipboard')).toEqual([['Binary data was copied to clipboard.']]);
	});
});
