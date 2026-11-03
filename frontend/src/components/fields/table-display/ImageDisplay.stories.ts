import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import ImageDisplay from './ImageDisplay.vue';

const meta = {
	title: 'Table Display Fields/Image',
	component: ImageDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 'https://via.placeholder.com/150',
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 'https://via.placeholder.com/150' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof ImageDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};

export const WithHeight: Story = { args: { widgetStructure: mockWidgetStructure({ height: 40 }) } };
