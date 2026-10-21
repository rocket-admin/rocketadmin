import { mount } from '@vue/test-utils';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';
import { describe, expect, it } from 'vitest';
import { mockWidgetStructure } from '../stories.mocks';
import UuidEdit from './UuidEdit.vue';

const EXISTING = '550e8400-e29b-41d4-a716-446655440000';

function emitted(wrapper: ReturnType<typeof mount>): string[] {
	return (wrapper.emitted('fieldChange') ?? []).map(([value]) => value as string);
}

describe('UuidEdit', () => {
	it('generates and emits a v4 UUID for a new row', async () => {
		const wrapper = mount(UuidEdit, { props: { label: 'id', value: '' } });
		await wrapper.vm.$nextTick();
		const [generated] = emitted(wrapper);
		expect(generated && uuidValidate(generated)).toBe(true);
		expect(uuidVersion(generated ?? '')).toBe(4);
		expect((wrapper.find('input').element as HTMLInputElement).value).toBe(generated);
	});

	it('keeps an existing value and emits nothing on mount', () => {
		const wrapper = mount(UuidEdit, { props: { label: 'id', value: EXISTING } });
		expect(wrapper.emitted('fieldChange')).toBeUndefined();
		expect((wrapper.find('input').element as HTMLInputElement).value).toBe(EXISTING);
	});

	it.each([
		['v1', 1],
		['v4', 4],
		['v7', 7],
		['v3', 3],
		['v5', 5],
	])('generates a %s UUID from widget params', (version, expected) => {
		const wrapper = mount(UuidEdit, { props: { label: 'id', widgetStructure: mockWidgetStructure({ version }) } });
		const [generated = ''] = emitted(wrapper);
		expect(uuidValidate(generated)).toBe(true);
		expect(uuidVersion(generated)).toBe(expected);
	});

	it('generates the same v5 UUID for the same namespace and name', async () => {
		const widgetStructure = mockWidgetStructure({
			version: 'v5',
			namespace: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
			name: 'test',
		});
		const wrapper = mount(UuidEdit, { props: { label: 'id', widgetStructure } });
		await wrapper.find('button').trigger('click');
		const [first, second] = emitted(wrapper);
		expect(first).toBe(second);
	});

	it('falls back to v4 for an unknown version', () => {
		const wrapper = mount(UuidEdit, {
			props: { label: 'id', widgetStructure: mockWidgetStructure({ version: 'v99' }) },
		});
		expect(uuidVersion(emitted(wrapper)[0] ?? '')).toBe(4);
	});

	it('regenerates on the refresh button', async () => {
		const wrapper = mount(UuidEdit, { props: { label: 'id', value: EXISTING } });
		await wrapper.find('button[aria-label="Generate new UUID"]').trigger('click');
		const [generated = ''] = emitted(wrapper);
		expect(uuidValidate(generated)).toBe(true);
		expect(generated).not.toBe(EXISTING);
	});

	it('hides the refresh button when readonly or disabled', () => {
		expect(
			mount(UuidEdit, { props: { label: 'id', value: EXISTING, readonly: true } })
				.find('button')
				.exists(),
		).toBe(false);
		expect(
			mount(UuidEdit, { props: { label: 'id', value: EXISTING, disabled: true } })
				.find('button')
				.exists(),
		).toBe(false);
	});

	it('shows the detected version for a valid UUID', () => {
		const wrapper = mount(UuidEdit, { props: { label: 'id', value: EXISTING } });
		expect(wrapper.text()).toContain('UUID v4');
	});

	it('flags an invalid UUID and emits the typed text', async () => {
		const wrapper = mount(UuidEdit, { props: { label: 'id', value: EXISTING } });
		await wrapper.find('input').setValue('not-a-uuid');
		expect(wrapper.text()).toContain('Invalid UUID format');
		expect(wrapper.emitted('fieldChange')).toEqual([['not-a-uuid']]);
	});

	it('explains v3/v5 hashing when editable', () => {
		const wrapper = mount(UuidEdit, {
			props: { label: 'id', value: EXISTING, widgetStructure: mockWidgetStructure({ version: 'v3' }) },
		});
		expect(wrapper.text()).toContain('UUID v3 uses namespace/name hashing.');
	});
});
