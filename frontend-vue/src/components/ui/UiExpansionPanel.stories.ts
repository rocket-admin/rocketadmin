import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import UiAccordion from './UiAccordion.vue';
import UiExpansionPanel from './UiExpansionPanel.vue';
import UiIconButton from './UiIconButton.vue';

/**
 * Collapsible section: a header `<button>` with `aria-expanded`/`aria-controls` and a labelled
 * `region`. The `actions` slot sits in the header row but outside the button, for links and icon
 * buttons. Wrap panels in `UiAccordion` to keep one open at a time (or `multi` for any number).
 */
const meta = {
	title: 'UI/ExpansionPanel',
	component: UiExpansionPanel,
	subcomponents: { UiAccordion },
	tags: ['autodocs'],
	args: { title: 'Advanced settings', description: '', disabled: false, hideToggle: false, lazy: false },
	render: (args) => ({
		components: { UiExpansionPanel },
		setup: () => ({ args, open: ref(false) }),
		template: `
      <UiExpansionPanel v-bind="args" v-model:open="open">
        <p style="margin: 0;">SSH tunnel, SSL certificates and the master encryption password.</p>
      </UiExpansionPanel>
    `,
	}),
} satisfies Meta<typeof UiExpansionPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithDescription: Story = { args: { title: 'Orders', description: '12 related records' } };

/** The related-records shape: header actions outside the toggle button. */
export const WithActions: Story = {
	render: () => ({
		components: { UiExpansionPanel, UiIconButton },
		template: `
      <UiExpansionPanel title="orders" :open="true">
        <template #actions>
          <UiIconButton icon="add" label="Add a new record to orders" size="sm" />
          <UiIconButton icon="open_in_new" label="Open records in table view" size="sm" />
        </template>
        <p style="margin: 0;">Order #1001 — shipped</p>
      </UiExpansionPanel>
    `,
	}),
};

/** Single-open accordion and a `multi` one. */
export const Accordion: Story = {
	render: () => ({
		components: { UiAccordion, UiExpansionPanel },
		template: `
      <div style="display: grid; gap: 2rem;">
        <UiAccordion>
          <UiExpansionPanel title="General" :open="true">General settings</UiExpansionPanel>
          <UiExpansionPanel title="Security">Security settings</UiExpansionPanel>
          <UiExpansionPanel title="Danger zone">Delete this connection</UiExpansionPanel>
        </UiAccordion>
        <UiAccordion multi>
          <UiExpansionPanel title="orders" :open="true">Orders</UiExpansionPanel>
          <UiExpansionPanel title="invoices" :open="true">Invoices</UiExpansionPanel>
        </UiAccordion>
      </div>
    `,
	}),
};

/** Closed / open / with description / disabled without chevron. */
export const AllVariants: Story = {
	render: () => ({
		components: { UiExpansionPanel },
		template: `
      <div style="display: grid; gap: 0.75rem; max-width: 40rem;">
        <UiExpansionPanel title="Closed">Content</UiExpansionPanel>
        <UiExpansionPanel title="Open" :open="true">Content</UiExpansionPanel>
        <UiExpansionPanel title="With description" description="Secondary text">Content</UiExpansionPanel>
        <UiExpansionPanel title="Disabled" description="Empty" disabled hide-toggle>Content</UiExpansionPanel>
      </div>
    `,
	}),
};
