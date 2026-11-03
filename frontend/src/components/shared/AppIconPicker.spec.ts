import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import AppIconPicker from './AppIconPicker.vue';

const ICONS = ['star', 'favorite', 'bolt'];

let wrapper: ReturnType<typeof mountPicker> | undefined;

function mountPicker(props: Record<string, unknown> = {}) {
	return mount(AppIconPicker, { props: { defaultIcons: ICONS, ...props }, attachTo: document.body });
}

afterEach(() => {
	wrapper?.unmount();
	wrapper = undefined;
});

const trigger = () => wrapper!.get('.app-icon-picker__trigger');
const panel = () => wrapper!.get('[role="dialog"]');
const isOpen = () => (panel().element as HTMLElement).style.display !== 'none';

describe('AppIconPicker', () => {
	it('labels the trigger by whether an icon is set, with the tooltip as title', () => {
		wrapper = mountPicker({ tooltip: 'Choose an icon' });
		expect(trigger().text()).toBe('Add icon');
		expect(trigger().attributes('title')).toBe('Choose an icon');
		wrapper.unmount();

		wrapper = mountPicker({ icon: 'star' });
		expect(trigger().text()).toContain('Change icon');
		expect(trigger().get('.ui-icon').text()).toBe('star');
	});

	it('opens the panel on click and moves focus into it', async () => {
		wrapper = mountPicker({ icon: 'favorite' });
		await trigger().trigger('click');
		await flushPromises();

		expect(isOpen()).toBe(true);
		expect(trigger().attributes('aria-expanded')).toBe('true');
		// The checked suggestion takes focus.
		expect((document.activeElement as HTMLInputElement).value).toBe('favorite');
	});

	it('offers the suggestions as named radios with the current icon checked', () => {
		wrapper = mountPicker({ icon: 'bolt' });
		const radios = wrapper.findAll('input[type="radio"]');

		expect(radios.map((radio) => (radio.element as HTMLInputElement).value)).toEqual(ICONS);
		expect((radios[2]?.element as HTMLInputElement).checked).toBe(true);
		expect(wrapper.findAll('.app-icon-picker__option')[0]?.text()).toContain('star');
	});

	it('emits a picked suggestion, and closes on a pointer click', async () => {
		wrapper = mountPicker();
		await trigger().trigger('click');
		const radio = wrapper.findAll('input[type="radio"]')[1]!;

		await radio.setValue(true);
		expect(wrapper.emitted('change')?.[0]).toEqual(['favorite']);
		expect(isOpen()).toBe(true);

		// detail 1 = a real pointer click; arrow-key selection dispatches click with detail 0.
		radio.element.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
		await flushPromises();
		expect(isOpen()).toBe(false);
	});

	it('applies a custom icon name and closes', async () => {
		wrapper = mountPicker();
		await trigger().trigger('click');
		const apply = wrapper.findAll('button').find((button) => button.text() === 'Apply')!;
		expect(apply.attributes('disabled')).toBeDefined();

		await wrapper.get('input[type="text"]').setValue('rocket_launch');
		await wrapper.get('form').trigger('submit');

		expect(wrapper.emitted('change')?.[0]).toEqual(['rocket_launch']);
		expect(isOpen()).toBe(false);
	});

	it('shows Remove only with an icon and resetButtonShown, emitting null', async () => {
		wrapper = mountPicker({ icon: 'star' });
		expect(wrapper.findAll('button').some((button) => button.text() === 'Remove')).toBe(false);
		wrapper.unmount();

		wrapper = mountPicker({ icon: 'star', resetButtonShown: true });
		await trigger().trigger('click');
		await wrapper
			.findAll('button')
			.find((button) => button.text() === 'Remove')!
			.trigger('click');

		expect(wrapper.emitted('change')?.[0]).toEqual([null]);
		expect(isOpen()).toBe(false);
	});

	it('closes on Escape and returns focus to the trigger', async () => {
		wrapper = mountPicker();
		await trigger().trigger('click');
		await flushPromises();

		await panel().trigger('keydown', { key: 'Escape' });

		expect(isOpen()).toBe(false);
		expect(document.activeElement).toBe(trigger().element);
	});

	it('closes on a pointerdown outside', async () => {
		wrapper = mountPicker();
		await trigger().trigger('click');

		document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
		await flushPromises();

		expect(isOpen()).toBe(false);
	});
});
