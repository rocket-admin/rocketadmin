import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { type ConcreteComponent, ref } from 'vue';
import type { SelectOption, SelectValue } from './selectOption';
import UiField from './UiField.vue';
import UiSelect from './UiSelect.vue';

const PLANS: SelectOption<string>[] = [
	{ value: 'free', label: 'Free' },
	{ value: 'team', label: 'Team' },
	{ value: 'enterprise', label: 'Enterprise', disabled: true },
];

const TYPED: SelectOption<SelectValue>[] = [
	{ value: true, label: 'true (boolean)' },
	{ value: 42, label: '42 (number)' },
	{ value: '42', label: '"42" (string)' },
	{ value: null, label: 'null' },
];

/**
 * Native `<select>`, so the platform picker handles keyboard and screenreaders. Option values are
 * typed — `true`, `42` and `null` come back through `v-model` as themselves, not as strings. The
 * _Typed Values_ story prints the model so you can see it.
 *
 * Searchable lists use `UiAutocomplete`.
 */
// `component` is widened and `Meta` left untyped: Storybook's types cannot infer args from a
// generic SFC (`<script setup generic="T">`). Autodocs still reads the props from the component.
const meta = {
	title: 'UI/Select',
	component: UiSelect as ConcreteComponent,
	tags: ['autodocs'],
	parameters: { layout: 'padded' },
	args: { options: PLANS, placeholder: 'Choose a plan', size: 'md', multiple: false, disabled: false },
	argTypes: { size: { control: 'inline-radio', options: ['sm', 'md'] }, options: { control: false } },
	render: (args) => ({
		components: { UiField, UiSelect },
		setup: () => ({ args, value: ref<unknown>(null) }),
		template: `
      <div style="max-width: 22rem;">
        <UiField label="Plan"><UiSelect v-bind="args" v-model="value" /></UiField>
      </div>
    `,
	}),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The model is printed with its JS type: nothing is stringified on the way through. */
export const TypedValues: Story = {
	render: () => ({
		components: { UiField, UiSelect },
		setup: () => ({ options: TYPED, value: ref<SelectValue>(42) }),
		template: `
      <div style="max-width: 22rem; display: grid; gap: 0.75rem;">
        <UiField label="Value"><UiSelect v-model="value" :options="options" /></UiField>
        <code>{{ value === null ? 'null' : typeof value }}: {{ JSON.stringify(value) }}</code>
      </div>
    `,
	}),
};

/** A native list box. The model is an array; the placeholder is not rendered. */
export const Multiple: Story = {
	render: () => ({
		components: { UiField, UiSelect },
		setup: () => ({ options: PLANS, value: ref<string[]>(['free']) }),
		template: `
      <div style="max-width: 22rem; display: grid; gap: 0.75rem;">
        <UiField label="Plans"><UiSelect v-model="value" :options="options" multiple /></UiField>
        <code>{{ JSON.stringify(value) }}</code>
      </div>
    `,
	}),
};

/** Every state, both sizes. */
export const AllVariants: Story = {
	render: () => ({
		components: { UiField, UiSelect },
		setup: () => ({ options: PLANS }),
		template: `
      <form style="display: grid; gap: 1.25rem; max-width: 22rem;">
        <UiField label="Placeholder"><UiSelect :options="options" placeholder="Choose a plan" /></UiField>
        <UiField label="Selected"><UiSelect :options="options" model-value="team" /></UiField>
        <UiField label="With hint" hint="You can change this later."><UiSelect :options="options" model-value="free" /></UiField>
        <UiField label="With error" error="Pick a plan." required><UiSelect :options="options" placeholder="Choose a plan" /></UiField>
        <UiField label="Disabled"><UiSelect :options="options" model-value="free" disabled /></UiField>
        <UiField label="Small"><UiSelect :options="options" model-value="free" size="sm" /></UiField>
        <UiField label="Multiple"><UiSelect :options="options" :model-value="['free', 'team']" multiple /></UiField>
      </form>
    `,
	}),
};
