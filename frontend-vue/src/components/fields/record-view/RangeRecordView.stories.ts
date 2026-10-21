import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import RangeRecordView from './RangeRecordView.vue';

const meta = {
	title: 'Record View Fields/Range',
	component: RangeRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '[1, 100]',
		structure: mockStructure({ data_type: 'int', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '[1, 100]' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof RangeRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};

export const Numeric: Story = { args: { value: 30, widgetStructure: mockWidgetStructure({ min: 0, max: 50 }) } };
