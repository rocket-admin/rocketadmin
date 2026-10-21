import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import SelectRecordView from './SelectRecordView.vue';

const meta = {
	title: 'Record View Fields/Select',
	component: SelectRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 'option1',
		structure: mockStructure({ data_type: 'enum', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 'option1' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof SelectRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};

export const WithOptions: Story = {
	args: {
		widgetStructure: mockWidgetStructure({
			options: [
				{ value: 'option1', label: 'Option one', background_color: 'lightgreen' },
				{ value: 'option2', label: 'Option two' },
			],
		}),
	},
};
