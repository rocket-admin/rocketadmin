import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import UiTab from './UiTab.vue';
import UiTabPanel from './UiTabPanel.vue';
import UiTabs from './UiTabs.vue';

/**
 * Mounts a three-tab list wired the way a view would, with `v-model` emulated so selection
 * actually moves — the keyboard assertions below are meaningless against a frozen `modelValue`.
 */
function mountTabs(options: { disabled?: string; selected?: string } = {}) {
	return mount(
		{
			components: { UiTabs, UiTab, UiTabPanel },
			data: () => ({ selected: options.selected ?? 'edit' }),
			props: { disabledValue: { type: String, default: options.disabled } },
			template: `
        <UiTabs v-model="selected" label="Composer mode">
          <template #tabs>
            <UiTab value="edit" :disabled="disabledValue === 'edit'">Ask for a change</UiTab>
            <UiTab value="chat" :disabled="disabledValue === 'chat'">Chat</UiTab>
            <UiTab value="history" :disabled="disabledValue === 'history'">History</UiTab>
          </template>
          <UiTabPanel value="edit">Edit panel</UiTabPanel>
          <UiTabPanel value="chat">Chat panel</UiTabPanel>
          <UiTabPanel value="history">History panel</UiTabPanel>
        </UiTabs>
      `,
		},
		{ props: { disabledValue: options.disabled }, attachTo: document.body },
	);
}

/** Indexed lookup that satisfies `noUncheckedIndexedAccess` and fails loudly rather than silently. */
function tabAt(wrapper: ReturnType<typeof mountTabs>, index: number) {
	const tab = wrapper.findAll('[role="tab"]')[index];
	if (!tab) throw new Error(`No tab at index ${index}`);
	return tab;
}

describe('UiTabs', () => {
	it('builds a valid ARIA tree: a tablist of tabs, each controlling its panel', () => {
		const wrapper = mountTabs();
		const list = wrapper.get('[role="tablist"]');
		const tabs = wrapper.findAll('[role="tab"]');

		// The defect this component exists to fix: a tablist with zero role="tab" children.
		expect(tabs).toHaveLength(3);
		expect(list.attributes('aria-label')).toBe('Composer mode');

		const panel = wrapper.get('[role="tabpanel"]');
		expect(tabAt(wrapper, 0).attributes('aria-controls')).toBe(panel.attributes('id'));
		expect(panel.attributes('aria-labelledby')).toBe(tabAt(wrapper, 0).attributes('id'));
	});

	it('marks only the selected tab aria-selected', () => {
		const wrapper = mountTabs({ selected: 'chat' });
		const selected = wrapper.findAll('[role="tab"]').map((t) => t.attributes('aria-selected'));

		expect(selected).toEqual(['false', 'true', 'false']);
	});

	it('renders only the selected panel', () => {
		const wrapper = mountTabs({ selected: 'chat' });

		expect(wrapper.findAll('[role="tabpanel"]')).toHaveLength(1);
		expect(wrapper.get('[role="tabpanel"]').text()).toBe('Chat panel');
	});

	it('gives exactly one tab a tabindex of 0 (roving tabindex)', () => {
		const wrapper = mountTabs();
		const tabIndexes = wrapper.findAll('[role="tab"]').map((t) => t.attributes('tabindex'));

		expect(tabIndexes).toEqual(['0', '-1', '-1']);
	});

	it('selects on click', async () => {
		const wrapper = mountTabs();

		await tabAt(wrapper, 1).trigger('click');

		expect(wrapper.get('[role="tabpanel"]').text()).toBe('Chat panel');
	});

	it('moves to the next tab on ArrowRight', async () => {
		const wrapper = mountTabs();

		await tabAt(wrapper, 0).trigger('keydown', { key: 'ArrowRight' });

		expect(tabAt(wrapper, 1).attributes('aria-selected')).toBe('true');
	});

	it('moves DOM focus along with selection, not just aria-selected', async () => {
		// The roving tabindex is only half the pattern; without focus actually moving, a keyboard user
		// sees the selection change while their focus stays behind on the old tab.
		const wrapper = mountTabs();

		await tabAt(wrapper, 0).trigger('keydown', { key: 'ArrowRight' });

		// Compared by id, not element identity: the re-render swaps the DOM node behind the wrapper.
		expect(document.activeElement?.id).toBe(tabAt(wrapper, 1).attributes('id'));
	});

	it('wraps from the last tab to the first on ArrowRight', async () => {
		const wrapper = mountTabs({ selected: 'history' });

		await tabAt(wrapper, 2).trigger('keydown', { key: 'ArrowRight' });

		expect(tabAt(wrapper, 0).attributes('aria-selected')).toBe('true');
	});

	it('wraps from the first tab to the last on ArrowLeft', async () => {
		const wrapper = mountTabs();

		await tabAt(wrapper, 0).trigger('keydown', { key: 'ArrowLeft' });

		expect(tabAt(wrapper, 2).attributes('aria-selected')).toBe('true');
	});

	it('jumps to the ends with Home and End', async () => {
		const wrapper = mountTabs({ selected: 'chat' });

		await tabAt(wrapper, 1).trigger('keydown', { key: 'End' });
		expect(tabAt(wrapper, 2).attributes('aria-selected')).toBe('true');

		await tabAt(wrapper, 2).trigger('keydown', { key: 'Home' });
		expect(tabAt(wrapper, 0).attributes('aria-selected')).toBe('true');
	});

	it('skips a disabled tab when navigating', async () => {
		const wrapper = mountTabs({ disabled: 'chat' });

		await tabAt(wrapper, 0).trigger('keydown', { key: 'ArrowRight' });

		// 'chat' sits between them and is disabled, so ArrowRight lands on 'history'.
		expect(tabAt(wrapper, 2).attributes('aria-selected')).toBe('true');
	});

	it('disables the disabled tab natively', () => {
		const wrapper = mountTabs({ disabled: 'chat' });

		expect(tabAt(wrapper, 1).attributes('disabled')).toBeDefined();
	});

	it('ignores keys it does not handle', async () => {
		const wrapper = mountTabs();

		await tabAt(wrapper, 0).trigger('keydown', { key: 'a' });

		expect(tabAt(wrapper, 0).attributes('aria-selected')).toBe('true');
	});

	it('makes the panel focusable, per the APG, for panels with no focusable content', () => {
		const wrapper = mountTabs();

		expect(wrapper.get('[role="tabpanel"]').attributes('tabindex')).toBe('0');
	});
});
