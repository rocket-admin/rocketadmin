import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import ColorRecordView from './ColorRecordView.vue';

const meta = {
	title: 'Record View Fields/Color',
	component: ColorRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '#FF5733',
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '#FF5733' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof ColorRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};

export const Rgb: Story = { args: { value: 'rgb(34, 139, 34)' } };
export const Invalid: Story = { args: { value: 'not-a-color' } };
