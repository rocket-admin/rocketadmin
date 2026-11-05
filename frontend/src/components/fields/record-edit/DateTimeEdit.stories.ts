import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import DateTimeEdit from './DateTimeEdit.vue';

const meta = {
	title: 'Record Edit Fields/DateTime',
	component: DateTimeEdit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'DateTime Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'datetime', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: '2024-01-15T10:30:00',
	},
} satisfies Meta<typeof DateTimeEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
