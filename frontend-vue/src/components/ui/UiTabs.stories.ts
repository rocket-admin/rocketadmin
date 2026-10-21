import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import UiTab from './UiTab.vue';
import UiTabPanel from './UiTabPanel.vue';
import UiTabs from './UiTabs.vue';

/**
 * Tab list with roving `tabindex` and APG keyboard navigation.
 *
 * Exists because its one call site is *currently broken ARIA*: `WebsiteDetailView`'s composer-mode
 * switcher is a `role="tablist"` wrapping plain buttons — no `role="tab"`, no `aria-selected`, no
 * `aria-controls` — so a screenreader announces a tab list with zero tabs. Fixing it inline meant
 * writing this keyboard handling anyway; here it is testable.
 *
 * Keyboard: **←/→** move and wrap, **Home/End** jump to the ends, disabled tabs are skipped, and
 * only the selected tab is in the tab order. Selection follows focus.
 *
 * Composition is two slots: tabs go in `#tabs`, panels in the default slot.
 */
const meta = {
	title: 'UI/Tabs',
	component: UiTabs,
	subcomponents: { UiTab, UiTabPanel },
	tags: ['autodocs'],
	parameters: { layout: 'padded' },
	args: { modelValue: 'edit', label: 'Composer mode' },
} satisfies Meta<typeof UiTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Click a tab, then use ←/→ and Home/End — selection follows focus. */
export const Default: Story = {
	render: (args) => ({
		components: { UiTabs, UiTab, UiTabPanel },
		setup: () => {
			const selected = ref('edit');
			return { args, selected };
		},
		template: `
      <UiTabs v-model="selected" :label="args.label">
        <template #tabs>
          <UiTab value="edit">Ask for a change</UiTab>
          <UiTab value="chat">Chat</UiTab>
          <UiTab value="history">History</UiTab>
        </template>

        <UiTabPanel value="edit">Describe the change you want and the AI will apply it.</UiTabPanel>
        <UiTabPanel value="chat">Message your teammates about this site.</UiTabPanel>
        <UiTabPanel value="history">Every generation, newest first.</UiTabPanel>
      </UiTabs>
    `,
	}),
};

/**
 * The real WebsiteDetailView shape: chat is unavailable until the live connection is up. Arrow
 * from "Ask for a change" — focus skips the disabled tab entirely rather than landing on a dead one.
 */
export const WithDisabledTab: Story = {
	render: (args) => ({
		components: { UiTabs, UiTab, UiTabPanel },
		setup: () => {
			const selected = ref('edit');
			return { args, selected };
		},
		template: `
      <UiTabs v-model="selected" :label="args.label">
        <template #tabs>
          <UiTab value="edit">Ask for a change</UiTab>
          <UiTab value="chat" disabled>Chat (offline)</UiTab>
          <UiTab value="history">History</UiTab>
        </template>

        <UiTabPanel value="edit">Describe the change you want.</UiTabPanel>
        <UiTabPanel value="chat">Unreachable while disabled.</UiTabPanel>
        <UiTabPanel value="history">Every generation, newest first.</UiTabPanel>
      </UiTabs>
    `,
	}),
};

/** Two tabs, the minimum that earns the pattern — a mode switch rather than navigation. */
export const TwoTabs: Story = {
	render: (args) => ({
		components: { UiTabs, UiTab, UiTabPanel },
		setup: () => {
			const selected = ref('preview');
			return { args, selected };
		},
		template: `
      <UiTabs v-model="selected" label="View mode">
        <template #tabs>
          <UiTab value="preview">Preview</UiTab>
          <UiTab value="code">Code</UiTab>
        </template>

        <UiTabPanel value="preview">The rendered site.</UiTabPanel>
        <UiTabPanel value="code">The generated source.</UiTabPanel>
      </UiTabs>
    `,
	}),
};

/** Every tab state at once — resting, selected, disabled — to catch drift between them. */
export const AllVariants: Story = {
	render: () => ({
		components: { UiTabs, UiTab, UiTabPanel },
		setup: () => {
			const selected = ref('selected');
			return { selected };
		},
		template: `
      <UiTabs v-model="selected" label="Tab states">
        <template #tabs>
          <UiTab value="selected">Selected</UiTab>
          <UiTab value="resting">Resting</UiTab>
          <UiTab value="disabled" disabled>Disabled</UiTab>
        </template>

        <UiTabPanel value="selected">The selected tab is the only one in the tab order.</UiTabPanel>
        <UiTabPanel value="resting">Reachable with ← and →, not with Tab.</UiTabPanel>
        <UiTabPanel value="disabled">Never reachable.</UiTabPanel>
      </UiTabs>
    `,
	}),
};
