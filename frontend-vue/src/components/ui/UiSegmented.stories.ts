import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { type ConcreteComponent, ref } from 'vue';
import type { SelectOption, SelectValue } from './selectOption';
import UiSegmented from './UiSegmented.vue';

const BOOLEAN: SelectOption<SelectValue>[] = [
	{ value: true, label: 'Yes' },
	{ value: false, label: 'No' },
	{ value: null, label: 'Null' },
];

/**
 * Single-choice toggle group on native radios: arrow keys move the choice, AT reads "Yes, radio
 * button, 1 of 3". Values are typed — the Yes / No / Null boolean editor round-trips `true`,
 * `false` and `null`. Always pass `label`: it is the group's only accessible name.
 */
// `component` is widened and `Meta` left untyped: Storybook's types cannot infer args from a
// generic SFC (`<script setup generic="T">`). Autodocs still reads the props from the component.
const meta = {
	title: 'UI/Segmented',
	component: UiSegmented as ConcreteComponent,
	tags: ['autodocs'],
	args: { options: BOOLEAN, label: 'Active', size: 'md', disabled: false },
	argTypes: { size: { control: 'inline-radio', options: ['sm', 'md'] }, options: { control: false } },
	render: (args) => ({
		components: { UiSegmented },
		setup: () => ({ args, value: ref<SelectValue>(true) }),
		template: `
      <div style="display: grid; gap: 0.75rem; justify-items: start;">
        <UiSegmented v-bind="args" v-model="value" />
        <code>{{ JSON.stringify(value) }}</code>
      </div>
    `,
	}),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = { args: { size: 'sm' } };

export const Disabled: Story = { args: { disabled: true } };

/** Both sizes × nothing chosen / chosen / one option disabled / all disabled. */
export const AllVariants: Story = {
	render: () => ({
		components: { UiSegmented },
		setup: () => ({
			sizes: ['sm', 'md'] as const,
			options: BOOLEAN,
			partlyDisabled: [...BOOLEAN.slice(0, 2), { value: null, label: 'Null', disabled: true }],
		}),
		template: `
      <table style="border-collapse: collapse;">
        <tbody>
          <tr v-for="size in sizes" :key="size">
            <th scope="row" style="text-align: left; padding: 0.5rem 1rem 0.5rem 0; font-size: 0.8125rem;">{{ size }}</th>
            <td style="padding: 0.5rem 1rem;"><UiSegmented :size="size" :options="options" label="None chosen" /></td>
            <td style="padding: 0.5rem 1rem;"><UiSegmented :size="size" :options="options" :model-value="false" label="Chosen" /></td>
            <td style="padding: 0.5rem 1rem;"><UiSegmented :size="size" :options="partlyDisabled" :model-value="true" label="One disabled" /></td>
            <td style="padding: 0.5rem 1rem;"><UiSegmented :size="size" :options="options" :model-value="null" label="Disabled" disabled /></td>
          </tr>
        </tbody>
      </table>
    `,
	}),
};
