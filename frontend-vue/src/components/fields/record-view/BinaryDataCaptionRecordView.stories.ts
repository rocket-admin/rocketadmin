import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import BinaryDataCaptionRecordView from './BinaryDataCaptionRecordView.vue';

const meta = {
	title: 'Record View Fields/BinaryDataCaption',
	component: BinaryDataCaptionRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '(binary data)',
		structure: mockStructure({ data_type: 'bytea', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '(binary data)' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof BinaryDataCaptionRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
