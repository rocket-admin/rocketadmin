import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPIED_MESSAGE } from '../useFieldWidget';
import { setupCopy } from './testing';
import UuidDisplay from './UuidDisplay.vue';

const uuid = '550e8400-e29b-41d4-a716-446655440000';

describe('UuidDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('displays the UUID', () => {
		expect(
			mount(UuidDisplay, { props: { value: uuid } })
				.get('.uuid-display__value')
				.text(),
		).toBe(uuid);
	});

	it('shows NULL, without a copy button, for an empty value', () => {
		const wrapper = mount(UuidDisplay, { props: { value: null } });
		expect(wrapper.get('.uuid-display__null').text()).toBe('NULL');
		expect(wrapper.find('button').exists()).toBe(false);
	});

	it('copies the UUID', async () => {
		const { attachTo, clickCopy } = setupCopy();
		const wrapper = mount(UuidDisplay, { props: { value: uuid }, attachTo });
		expect(wrapper.get('button').attributes('aria-label')).toBe('Copy UUID');
		expect(await clickCopy(wrapper)).toEqual({ copied: [uuid], emitted: [[COPIED_MESSAGE]], rowClicked: false });
	});
});
