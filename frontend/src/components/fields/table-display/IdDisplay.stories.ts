import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import IdDisplay from './IdDisplay.vue';

const meta = {
	title: 'Table Display Fields/Id',
	component: IdDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '12345',
		structure: mockStructure({ data_type: 'integer', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '12345' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof IdDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
