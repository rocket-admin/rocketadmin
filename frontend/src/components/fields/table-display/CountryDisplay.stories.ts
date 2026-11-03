import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import CountryDisplay from './CountryDisplay.vue';

const meta = {
	title: 'Table Display Fields/Country',
	component: CountryDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 'US',
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 'US' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof CountryDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
