import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import BinaryRecordView from './BinaryRecordView.vue';

const meta = {
	title: 'Record View Fields/Binary',
	component: BinaryRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 'Hello, binary world',
		structure: mockStructure({ data_type: 'bytea', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 'Hello, binary world' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof BinaryRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};

export const Base64: Story = { args: { widgetStructure: mockWidgetStructure({ encoding: 'base64' }) } };
