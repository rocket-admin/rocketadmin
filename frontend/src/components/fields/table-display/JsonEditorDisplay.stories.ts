import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import JsonEditorDisplay from './JsonEditorDisplay.vue';

const meta = {
	title: 'Table Display Fields/JsonEditor',
	component: JsonEditorDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '{"key": "value"}',
		structure: mockStructure({ data_type: 'json', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '{"key": "value"}' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof JsonEditorDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
