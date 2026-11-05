import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import BooleanRecordView from './BooleanRecordView.vue';

const meta = {
	title: 'Record View Fields/Boolean',
	component: BooleanRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: true,
		structure: mockStructure({ data_type: 'boolean', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: true },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof BooleanRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};

export const False: Story = { args: { value: false } };
export const InvertedColors: Story = { args: { widgetStructure: mockWidgetStructure({ invertColors: true }) } };
