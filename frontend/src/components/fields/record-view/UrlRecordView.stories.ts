import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import UrlRecordView from './UrlRecordView.vue';

const meta = {
	title: 'Record View Fields/Url',
	component: UrlRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 'https://example.com',
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 'https://example.com' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof UrlRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
