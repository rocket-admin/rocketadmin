import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import DateTimeFilter from './DateTimeFilter.vue';

const meta = {
	title: 'Filter Fields/DateTime',
	component: DateTimeFilter,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Field Label',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'datetime', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: '2024-01-15T10:30:00',
	},
} satisfies Meta<typeof DateTimeFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Between: Story = {
	args: { comparator: 'between', value: ['2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z'] },
};
export const LastDayPreset: Story = { args: { value: undefined } };
