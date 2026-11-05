import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import S3RecordView from './S3RecordView.vue';

const meta = {
	title: 'Record View Fields/S3',
	component: S3RecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 's3://bucket/file.txt',
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 's3://bucket/file.txt' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof S3RecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
