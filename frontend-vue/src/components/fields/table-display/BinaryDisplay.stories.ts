import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import BinaryDisplay from './BinaryDisplay.vue';

const meta = {
	title: 'Table Display Fields/Binary',
	component: BinaryDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 'Hello, binary world',
		structure: mockStructure({ data_type: 'bytea', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 'Hello, binary world' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof BinaryDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};

export const Base64: Story = { args: { widgetStructure: mockWidgetStructure({ encoding: 'base64' }) } };
