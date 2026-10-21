import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import MarkdownEdit from './MarkdownEdit.vue';

const meta = {
	title: 'Record Edit Fields/Markdown',
	component: MarkdownEdit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Markdown Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'text', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: '# Hello\nThis is **markdown** content with a [link](https://example.com).',
	},
} satisfies Meta<typeof MarkdownEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
