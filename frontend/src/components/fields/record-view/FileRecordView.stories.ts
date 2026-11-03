import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import FileRecordView from './FileRecordView.vue';

const meta = {
	title: 'Record View Fields/File',
	component: FileRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 'document.pdf',
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 'document.pdf' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof FileRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};

export const BinaryBlob: Story = { args: { value: { type: 'Buffer', data: [1, 2, 3] } } };
