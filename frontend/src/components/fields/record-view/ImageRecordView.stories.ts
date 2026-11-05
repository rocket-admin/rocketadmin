import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import ImageRecordView from './ImageRecordView.vue';

const meta = {
	title: 'Record View Fields/Image',
	component: ImageRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 'https://via.placeholder.com/150',
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 'https://via.placeholder.com/150' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof ImageRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
