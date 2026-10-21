import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import TextRecordView from './TextRecordView.vue';

const meta = {
	title: 'Record View Fields/Text',
	component: TextRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 'Sample text',
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 'Sample text' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof TextRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};

export const Invalid: Story = {
	args: { value: 'not-an-email', widgetStructure: mockWidgetStructure({ validate: 'isEmail' }) },
};
