import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure } from '../stories.mocks';
import DateFilter from './DateFilter.vue';
import DefaultFilter from './DefaultFilter.vue';
import NumberFilter from './NumberFilter.vue';
import TextFilter from './TextFilter.vue';

// No Angular story existed for DefaultFilterComponent; these show each comparator family and the
// in / between layouts it adds around the wrapped widget.
const meta = {
	title: 'Filter Fields/Default',
	component: DefaultFilter,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Field Label',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		valueComponent: TextFilter,
		comparator: 'eq',
		value: 'Sample text',
	},
} satisfies Meta<typeof DefaultFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const TextContains: Story = { args: { comparator: 'contains' } };
export const TextIsEmpty: Story = { args: { comparator: 'empty', value: '' } };
export const NumberEqual: Story = {
	args: { valueComponent: NumberFilter, value: 42, structure: mockStructure({ data_type: 'int' }) },
};
export const NumberIn: Story = {
	args: {
		valueComponent: NumberFilter,
		comparator: 'in',
		value: ['1', '2', '3'],
		structure: mockStructure({ data_type: 'int' }),
	},
};
export const NumberBetween: Story = {
	args: {
		valueComponent: NumberFilter,
		comparator: 'between',
		value: [10, 20],
		structure: mockStructure({ data_type: 'int' }),
	},
};
export const DateBetween: Story = {
	args: {
		valueComponent: DateFilter,
		comparator: 'between',
		value: ['2024-01-01', '2024-01-31'],
		structure: mockStructure({ data_type: 'date' }),
	},
};
