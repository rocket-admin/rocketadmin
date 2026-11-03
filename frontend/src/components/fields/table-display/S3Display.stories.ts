import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import S3Display from './S3Display.vue';

const meta = {
	title: 'Table Display Fields/S3',
	component: S3Display,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 's3://bucket/file.txt',
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 's3://bucket/file.txt' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof S3Display>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
