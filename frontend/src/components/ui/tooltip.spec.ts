import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';
import { vTooltip } from './tooltip';
import { TOOLTIP_BUBBLE_ID } from './tooltipState';

function mountHost(template: string, setup: () => Record<string, unknown> = () => ({})) {
	const Host = defineComponent({ directives: { tooltip: vTooltip }, setup, template });
	return mount(Host, { attachTo: document.body });
}

const bubble = () => document.getElementById(TOOLTIP_BUBBLE_ID) as HTMLElement;
const isShown = () => bubble().style.display !== 'none';
/** The text a host's aria-describedby resolves to — what a screenreader announces. */
const description = (el: Element) =>
	(el.getAttribute('aria-describedby') ?? '')
		.split(' ')
		.filter(Boolean)
		.map((id) => document.getElementById(id)?.textContent?.trim())
		.join(' ');

describe('vTooltip', () => {
	let wrapper: ReturnType<typeof mountHost> | undefined;

	beforeEach(() => vi.useFakeTimers());
	afterEach(() => {
		wrapper?.unmount();
		wrapper = undefined;
		vi.useRealTimers();
	});

	it('describes the host with its text, before anything is shown', async () => {
		wrapper = mountHost(`<button v-tooltip="'Delete row'">x</button>`);
		await nextTick();

		expect(description(wrapper.get('button').element)).toBe('Delete row');
		expect(isShown()).toBe(false);
	});

	it('keeps aria-describedby ids the caller already set', async () => {
		wrapper = mountHost(`<div><p id="own">Own</p><button aria-describedby="own" v-tooltip="'Tip'">x</button></div>`);
		await nextTick();

		expect(wrapper.get('button').attributes('aria-describedby')?.split(' ')[0]).toBe('own');
		expect(description(wrapper.get('button').element)).toBe('Own Tip');
	});

	it('shows on hover and hides after the pointer leaves', async () => {
		wrapper = mountHost(`<button v-tooltip="'Edit row'">x</button>`);
		await wrapper.get('button').trigger('pointerenter');
		await nextTick();

		expect(isShown()).toBe(true);
		expect(bubble().textContent?.trim()).toBe('Edit row');
		expect(bubble().getAttribute('aria-hidden')).toBe('true');

		await wrapper.get('button').trigger('pointerleave');
		expect(isShown()).toBe(true);
		vi.advanceTimersByTime(150);
		await nextTick();
		expect(isShown()).toBe(false);
	});

	it('stays while the pointer moves onto the bubble', async () => {
		wrapper = mountHost(`<button v-tooltip="'Edit row'">x</button>`);
		await wrapper.get('button').trigger('pointerenter');
		await wrapper.get('button').trigger('pointerleave');
		bubble().dispatchEvent(new Event('pointerenter'));
		vi.advanceTimersByTime(500);
		await nextTick();

		expect(isShown()).toBe(true);
	});

	it('shows on focus and hides on blur', async () => {
		wrapper = mountHost(`<button v-tooltip="'Edit row'">x</button>`);
		await wrapper.get('button').trigger('focusin');
		expect(isShown()).toBe(true);

		await wrapper.get('button').trigger('focusout');
		expect(isShown()).toBe(false);
	});

	it('hides on Escape', async () => {
		wrapper = mountHost(`<button v-tooltip="'Edit row'">x</button>`);
		await wrapper.get('button').trigger('focusin');
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		await nextTick();

		expect(isShown()).toBe(false);
	});

	it('is disabled by an empty or false value, and follows value changes', async () => {
		const text = ref<string | false>('');
		wrapper = mountHost(`<button v-tooltip="text">x</button>`, () => ({ text }));
		const button = wrapper.get('button');
		await button.trigger('pointerenter');

		expect(isShown()).toBe(false);
		expect(button.attributes('aria-describedby')).toBeUndefined();

		text.value = 'Select sort order first';
		await nextTick();
		expect(description(button.element)).toBe('Select sort order first');

		text.value = false;
		await nextTick();
		expect(button.attributes('aria-describedby')).toBeUndefined();
	});

	it('reads its placement from the argument or a modifier, defaulting to bottom', async () => {
		wrapper = mountHost(`
      <div>
        <button class="a" v-tooltip:left="'A'">a</button>
        <button class="b" v-tooltip.top="'B'">b</button>
        <button class="c" v-tooltip="'C'">c</button>
      </div>
    `);
		// jsdom has a 1024×768 viewport and zero-sized rects at 0,0: top and left cannot fit, so
		// they flip to their opposites — which is itself the flip behaviour under test.
		Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
		Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });

		await wrapper.get('.c').trigger('pointerenter');
		await nextTick();
		await nextTick();
		expect(bubble().classList).toContain('ui-tooltip--placement-bottom');

		await wrapper.get('.a').trigger('pointerenter');
		await nextTick();
		await nextTick();
		expect(bubble().classList).toContain('ui-tooltip--placement-right');

		await wrapper.get('.b').trigger('pointerenter');
		await nextTick();
		await nextTick();
		expect(bubble().classList).toContain('ui-tooltip--placement-bottom');
		expect(bubble().textContent?.trim()).toBe('B');
	});

	it('shares one describer node between hosts with the same text and drops it when unused', async () => {
		const show = ref(true);
		wrapper = mountHost(
			`<div><button v-tooltip="'Same'">a</button><button v-if="show" v-tooltip="'Same'">b</button></div>`,
			() => ({ show }),
		);
		await nextTick();
		const [first, second] = wrapper.findAll('button');

		expect(first!.attributes('aria-describedby')).toBe(second!.attributes('aria-describedby'));
		const id = first!.attributes('aria-describedby')!;

		show.value = false;
		await nextTick();
		expect(document.getElementById(id)).not.toBeNull();

		wrapper.unmount();
		wrapper = undefined;
		await nextTick();
		expect(document.getElementById(id)).toBeNull();
	});

	it('hides when its host unmounts', async () => {
		const show = ref(true);
		wrapper = mountHost(`<div><button v-if="show" v-tooltip="'Bye'">x</button></div>`, () => ({ show }));
		await wrapper.get('button').trigger('focusin');
		expect(isShown()).toBe(true);

		show.value = false;
		await nextTick();
		expect(isShown()).toBe(false);
	});
});
