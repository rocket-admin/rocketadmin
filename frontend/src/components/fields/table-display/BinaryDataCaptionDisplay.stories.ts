import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import BinaryDataCaptionDisplay from './BinaryDataCaptionDisplay.vue';

const meta = {
	title: 'Table Display Fields/BinaryDataCaption',
	component: BinaryDataCaptionDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '(binary data)',
		structure: mockStructure({ data_type: 'bytea', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '(binary data)' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof BinaryDataCaptionDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
