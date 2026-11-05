import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import MarkdownRecordView from './MarkdownRecordView.vue';

const meta = {
	title: 'Record View Fields/Markdown',
	component: MarkdownRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '# Hello\nThis is **markdown**',
		structure: mockStructure({ data_type: 'text', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '# Hello\nThis is **markdown**' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof MarkdownRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
