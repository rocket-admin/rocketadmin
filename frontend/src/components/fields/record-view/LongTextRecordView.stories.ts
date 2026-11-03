import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import LongTextRecordView from './LongTextRecordView.vue';

const meta = {
	title: 'Record View Fields/LongText',
	component: LongTextRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
		structure: mockStructure({ data_type: 'text', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof LongTextRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
