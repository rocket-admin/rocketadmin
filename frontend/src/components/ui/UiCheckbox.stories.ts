import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import UiCheckbox from './UiCheckbox.vue';

/**
 * Native checkbox wrapped by its label, so clicking the text toggles it. With no visible text (a
 * table row), pass `aria-label` — it lands on the `<input>`; `class` lands on the label.
 */
const meta = {
	title: 'UI/Checkbox',
	component: UiCheckbox,
	tags: ['autodocs'],
	args: { indeterminate: false, disabled: false },
	render: (args) => ({
		components: { UiCheckbox },
		setup: () => ({ args, checked: ref(false) }),
		template: '<UiCheckbox v-bind="args" v-model="checked">Remember me</UiCheckbox>',
	}),
} satisfies Meta<typeof UiCheckbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The "some but not all" dash. Clicking still emits a plain boolean. */
export const Indeterminate: Story = { args: { indeterminate: true } };

export const Disabled: Story = { args: { disabled: true } };

/** Every state, enabled and disabled. */
export const AllVariants: Story = {
	render: () => ({
		components: { UiCheckbox },
		template: `
      <div style="display: grid; grid-template-columns: repeat(2, max-content); gap: 0.75rem 2rem;">
        <UiCheckbox>Unchecked</UiCheckbox>
        <UiCheckbox disabled>Unchecked, disabled</UiCheckbox>
        <UiCheckbox :model-value="true">Checked</UiCheckbox>
        <UiCheckbox :model-value="true" disabled>Checked, disabled</UiCheckbox>
        <UiCheckbox indeterminate>Indeterminate</UiCheckbox>
        <UiCheckbox indeterminate disabled>Indeterminate, disabled</UiCheckbox>
        <UiCheckbox aria-label="Select row 1" />
        <span style="font-size: 0.8125rem;">← no text, named by aria-label</span>
      </div>
    `,
	}),
};
