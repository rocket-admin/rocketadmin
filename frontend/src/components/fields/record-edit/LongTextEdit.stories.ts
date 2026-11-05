import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import LongTextEdit from './LongTextEdit.vue';

const meta = {
	title: 'Record Edit Fields/LongText',
	component: LongTextEdit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Long Text Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'text', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value:
			'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
	},
} satisfies Meta<typeof LongTextEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
