import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import IdRecordView from './IdRecordView.vue';

const meta = {
	title: 'Record View Fields/Id',
	component: IdRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '12345',
		structure: mockStructure({ data_type: 'int', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '12345' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof IdRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
