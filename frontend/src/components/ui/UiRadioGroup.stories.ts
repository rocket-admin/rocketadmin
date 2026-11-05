import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { type ConcreteComponent, ref } from 'vue';
import type { SelectOption, SelectValue } from './selectOption';
import UiField from './UiField.vue';
import UiRadio from './UiRadio.vue';
import UiRadioGroup from './UiRadioGroup.vue';

const ACCESS: SelectOption<string>[] = [
	{ value: 'none', label: 'No access' },
	{ value: 'readonly', label: 'Read only' },
	{ value: 'edit', label: 'Full access' },
	{ value: 'owner', label: 'Owner', disabled: true },
];

/**
 * Native radios sharing one `name` inside a `role="radiogroup"`: arrow keys move the choice and the
 * group is one tab stop. Pass `options`, or slot `UiRadio`s for custom labels. Name it with `label`,
 * or wrap it in a `UiField`, whose label it then points `aria-labelledby` at.
 */
// Widened like UiSelect's: Storybook's types cannot infer args from a generic SFC.
const meta = {
	title: 'UI/RadioGroup',
	component: UiRadioGroup as ConcreteComponent,
	subcomponents: { UiRadio: UiRadio as ConcreteComponent },
	tags: ['autodocs'],
	args: { options: ACCESS, label: 'Table access', orientation: 'vertical', disabled: false },
	argTypes: {
		orientation: { control: 'inline-radio', options: ['vertical', 'horizontal'] },
		options: { control: false },
	},
	render: (args) => ({
		components: { UiRadioGroup },
		setup: () => ({ args, value: ref<SelectValue>('readonly') }),
		template: `
      <div style="display: grid; gap: 0.75rem; justify-items: start;">
        <UiRadioGroup v-bind="args" v-model="value" />
        <code>{{ JSON.stringify(value) }}</code>
      </div>
    `,
	}),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Horizontal: Story = { args: { orientation: 'horizontal' } };

/** Slotted `UiRadio`s with typed values; named and described by the surrounding `UiField`. */
export const InField: Story = {
	render: () => ({
		components: { UiField, UiRadioGroup, UiRadio },
		setup: () => ({ value: ref<SelectValue>(null) }),
		template: `
      <UiField label="Sort direction" hint="Applies when the table opens" error="Choose a direction" required>
        <UiRadioGroup v-model="value">
          <UiRadio value="ASC">Ascending</UiRadio>
          <UiRadio value="DESC">Descending</UiRadio>
        </UiRadioGroup>
      </UiField>
    `,
	}),
};

/** Both orientations × chosen / nothing chosen / disabled. */
export const AllVariants: Story = {
	render: () => ({
		components: { UiRadioGroup },
		setup: () => ({ options: ACCESS, orientations: ['vertical', 'horizontal'] as const }),
		template: `
      <div style="display: grid; gap: 2rem;">
        <div v-for="orientation in orientations" :key="orientation" style="display: flex; gap: 3rem; flex-wrap: wrap;">
          <UiRadioGroup :orientation="orientation" :options="options" model-value="edit" label="Chosen" />
          <UiRadioGroup :orientation="orientation" :options="options" label="Nothing chosen" />
          <UiRadioGroup :orientation="orientation" :options="options" model-value="readonly" label="Disabled" disabled />
        </div>
      </div>
    `,
	}),
};
