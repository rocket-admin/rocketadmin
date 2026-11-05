import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import UiSwitch from './UiSwitch.vue';

/**
 * On/off switch on a native checkbox with `role="switch"` — AT announces "on/off". Use it for a
 * setting that applies immediately; a form choice that is submitted later is a `UiCheckbox`.
 */
const meta = {
	title: 'UI/Switch',
	component: UiSwitch,
	tags: ['autodocs'],
	args: { label: 'Show only my connections', size: 'md', labelPosition: 'after', disabled: false },
	argTypes: {
		size: { control: 'inline-radio', options: ['sm', 'md'] },
		labelPosition: { control: 'inline-radio', options: ['before', 'after'] },
	},
	render: (args) => ({
		components: { UiSwitch },
		setup: () => ({ args, on: ref(false) }),
		template: '<UiSwitch v-bind="args" v-model="on" />',
	}),
} satisfies Meta<typeof UiSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = { args: { disabled: true } };

/** Both sizes × off / on / disabled, and the label before the track. */
export const AllVariants: Story = {
	render: () => ({
		components: { UiSwitch },
		setup: () => ({ sizes: ['sm', 'md'] as const }),
		template: `
      <div style="display: grid; grid-template-columns: repeat(5, max-content); gap: 0.75rem 2rem;">
        <template v-for="size in sizes" :key="size">
          <UiSwitch :size="size" label="Off" />
          <UiSwitch :size="size" :model-value="true" label="On" />
          <UiSwitch :size="size" disabled label="Off, disabled" />
          <UiSwitch :size="size" :model-value="true" disabled label="On, disabled" />
          <UiSwitch :size="size" :model-value="true" label-position="before" label="Label before" />
        </template>
      </div>
    `,
	}),
};
