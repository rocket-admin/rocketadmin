import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import StaticTextRecordView from './StaticTextRecordView.vue';

const meta = {
	title: 'Record View Fields/StaticText',
	component: StaticTextRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 'Static content',
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 'Static content' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof StaticTextRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
