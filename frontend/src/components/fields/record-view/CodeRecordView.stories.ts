import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import CodeRecordView from './CodeRecordView.vue';

const meta = {
	title: 'Record View Fields/Code',
	component: CodeRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 'console.log("hello")',
		structure: mockStructure({ data_type: 'text', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 'console.log("hello")' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof CodeRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};

export const Javascript: Story = {
	args: {
		widgetStructure: mockWidgetStructure({ language: 'javascript' }),
		value: 'function add(a, b) {\n\treturn a + b;\n}',
	},
};
