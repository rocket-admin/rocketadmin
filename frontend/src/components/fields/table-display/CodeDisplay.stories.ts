import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import CodeDisplay from './CodeDisplay.vue';

const meta = {
	title: 'Table Display Fields/Code',
	component: CodeDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 'console.log("hello")',
		structure: mockStructure({ data_type: 'text', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 'console.log("hello")' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof CodeDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
