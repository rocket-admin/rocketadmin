import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import UiField from './UiField.vue';
import UiTextarea from './UiTextarea.vue';

/**
 * Multi-line text — long text, JSON and XML fields. Same contract as `UiInput`: wrap it in a
 * `UiField` and the label, hint and error wire themselves up.
 */
const meta = {
	title: 'UI/Textarea',
	component: UiTextarea,
	tags: ['autodocs'],
	parameters: { layout: 'padded' },
	args: { rows: 4, placeholder: 'Write something…', disabled: false, readonly: false, mono: false },
	render: (args) => ({
		components: { UiField, UiTextarea },
		setup: () => ({ args, value: ref('') }),
		template: `
      <div style="max-width: 28rem;">
        <UiField label="Description"><UiTextarea v-bind="args" v-model="value" /></UiField>
      </div>
    `,
	}),
} satisfies Meta<typeof UiTextarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** For code-like content: JSON, XML, hex dumps. */
export const Mono: Story = { args: { mono: true, rows: 6 } };

export const Disabled: Story = { args: { disabled: true } };

/**
 * Every state. `readonly` keeps the text selectable and in the tab order, unlike `disabled`.
 */
export const AllVariants: Story = {
	render: () => ({
		components: { UiField, UiTextarea },
		setup: () => ({ json: '{\n  "id": 1,\n  "name": "Ada"\n}' }),
		template: `
      <form style="display: grid; gap: 1.25rem; max-width: 28rem;">
        <UiField label="Default"><UiTextarea placeholder="Placeholder" /></UiField>
        <UiField label="With hint" hint="Markdown is allowed."><UiTextarea :rows="2" /></UiField>
        <UiField label="With error" error="Too long."><UiTextarea model-value="Far too much text" :rows="2" /></UiField>
        <UiField label="Mono"><UiTextarea mono :model-value="json" :rows="4" /></UiField>
        <UiField label="Readonly"><UiTextarea readonly model-value="Can select, cannot edit" :rows="2" /></UiField>
        <UiField label="Disabled"><UiTextarea disabled model-value="Locked" :rows="2" /></UiField>
      </form>
    `,
	}),
};
