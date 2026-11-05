import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import DateFilter from './DateFilter.vue';

const meta = {
	title: 'Filter Fields/Date',
	component: DateFilter,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Field Label',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'date', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: '2024-01-15',
	},
} satisfies Meta<typeof DateFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
