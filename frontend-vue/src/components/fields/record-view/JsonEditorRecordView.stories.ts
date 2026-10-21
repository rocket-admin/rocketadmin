import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import JsonEditorRecordView from './JsonEditorRecordView.vue';

const meta = {
	title: 'Record View Fields/JsonEditor',
	component: JsonEditorRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '{"key": "value"}',
		structure: mockStructure({ data_type: 'json', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '{"key": "value"}' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof JsonEditorRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};

export const ParsedObject: Story = { args: { value: { key: 'value', nested: { list: [1, 2, 3] } } } };
