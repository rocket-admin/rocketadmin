import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import SelectDisplay from './SelectDisplay.vue';

const meta = {
	title: 'Table Display Fields/Select',
	component: SelectDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 'option1',
		structure: mockStructure({
			data_type: 'enum',
			character_maximum_length: 255,
			data_type_params: ['option1', 'option2', 'option3'],
		}),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 'option1' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof SelectDisplay>;

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
				{ value: 'option1', label: 'Option One', background_color: 'rgba(16, 185, 129, 0.2)' },
				{ value: 'option2', label: 'Option Two' },
			],
		}),
	},
};
