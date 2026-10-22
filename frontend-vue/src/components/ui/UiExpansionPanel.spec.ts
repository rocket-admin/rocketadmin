import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';
import UiAccordion from './UiAccordion.vue';
import UiExpansionPanel from './UiExpansionPanel.vue';

function mountPanel(props: Record<string, unknown> = {}, slots: Record<string, () => unknown> = {}) {
	return mount(UiExpansionPanel, {
		props: { title: 'Advanced settings', ...props },
		slots: { default: () => 'Body', ...slots },
	});
}

const isVisible = (wrapper: ReturnType<typeof mountPanel>) =>
	(wrapper.get('[role="region"]').element as HTMLElement).style.display !== 'none';

describe('UiExpansionPanel', () => {
	it('wires the header button to its region', () => {
		const wrapper = mountPanel();
		const button = wrapper.get('button');
		const region = wrapper.get('[role="region"]');

		expect(button.text()).toBe('Advanced settings');
		expect(button.attributes('aria-expanded')).toBe('false');
		expect(button.attributes('aria-controls')).toBe(region.attributes('id'));
		expect(region.attributes('aria-labelledby')).toBe(button.attributes('id'));
		expect(isVisible(wrapper)).toBe(false);
	});

	it('toggles on click and emits update:open, opened and closed', async () => {
		const wrapper = mountPanel();
		await wrapper.get('button').trigger('click');

		expect(wrapper.get('button').attributes('aria-expanded')).toBe('true');
		expect(isVisible(wrapper)).toBe(true);
		expect(wrapper.emitted('update:open')?.at(-1)).toEqual([true]);
		expect(wrapper.emitted('opened')).toHaveLength(1);

		await wrapper.get('button').trigger('click');
		expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false]);
		expect(wrapper.emitted('closed')).toHaveLength(1);
	});

	it('toggles from a click on the chevron, but not from the actions slot', async () => {
		const wrapper = mountPanel({}, { actions: () => 'Add' });
		await wrapper.get('.ui-expansion-panel__actions').trigger('click');
		expect(wrapper.emitted('update:open')).toBeUndefined();

		await wrapper.get('.ui-expansion-panel__chevron').trigger('click');
		expect(wrapper.emitted('update:open')?.at(-1)).toEqual([true]);
	});

	it('follows a bound open prop', async () => {
		const wrapper = mountPanel({ open: true });
		expect(isVisible(wrapper)).toBe(true);

		await wrapper.setProps({ open: false });
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('false');
	});

	it('cannot be toggled when disabled', async () => {
		const wrapper = mountPanel({ disabled: true });
		await wrapper.get('.ui-expansion-panel__header').trigger('click');

		expect(wrapper.get('button').attributes('disabled')).toBeDefined();
		expect(wrapper.emitted('update:open')).toBeUndefined();
		expect(wrapper.classes()).toContain('ui-expansion-panel--disabled');
	});

	it('renders title and description slots, and hides the chevron on request', () => {
		const wrapper = mountPanel({ hideToggle: true }, { title: () => 'Orders', description: () => 'Empty' });

		expect(wrapper.get('.ui-expansion-panel__title').text()).toBe('Orders');
		expect(wrapper.get('.ui-expansion-panel__description').text()).toBe('Empty');
		expect(wrapper.find('.ui-expansion-panel__chevron').exists()).toBe(false);
	});

	it('wraps the button in a heading when headingLevel is set', () => {
		expect(mountPanel({ headingLevel: 3 }).find('h3 > button').exists()).toBe(true);
		expect(mountPanel().find('h3').exists()).toBe(false);
	});

	it('keeps content rendered while collapsed, unless lazy', async () => {
		expect(mountPanel().get('[role="region"]').text()).toBe('Body');

		const lazy = mountPanel({ lazy: true });
		expect(lazy.get('[role="region"]').text()).toBe('');
		await lazy.get('button').trigger('click');
		expect(lazy.get('[role="region"]').text()).toBe('Body');
		await lazy.get('button').trigger('click');
		expect(lazy.get('[role="region"]').text()).toBe('Body');
	});
});

describe('UiAccordion', () => {
	const Host = (multi: boolean) =>
		defineComponent({
			components: { UiAccordion, UiExpansionPanel },
			setup: () => ({ multi, a: ref(true), b: ref(false) }),
			template: `
        <UiAccordion :multi="multi">
          <UiExpansionPanel v-model:open="a" title="A">a</UiExpansionPanel>
          <UiExpansionPanel v-model:open="b" title="B">b</UiExpansionPanel>
          <UiExpansionPanel title="C">c</UiExpansionPanel>
        </UiAccordion>
      `,
		});

	const expanded = (wrapper: ReturnType<typeof mount>) =>
		wrapper.findAll('button').map((button) => button.attributes('aria-expanded'));

	it('keeps a single panel open by default', async () => {
		const wrapper = mount(Host(false));
		expect(expanded(wrapper)).toEqual(['true', 'false', 'false']);

		await wrapper.findAll('button')[1]!.trigger('click');
		await nextTick();
		expect(expanded(wrapper)).toEqual(['false', 'true', 'false']);

		await wrapper.findAll('button')[2]!.trigger('click');
		await nextTick();
		expect(expanded(wrapper)).toEqual(['false', 'false', 'true']);
	});

	it('lets several panels open with multi', async () => {
		const wrapper = mount(Host(true));
		await wrapper.findAll('button')[1]!.trigger('click');
		await nextTick();

		expect(expanded(wrapper)).toEqual(['true', 'true', 'false']);
	});
});
