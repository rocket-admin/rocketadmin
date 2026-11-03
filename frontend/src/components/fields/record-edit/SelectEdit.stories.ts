import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import SelectEdit from './SelectEdit.vue';

const meta = {
	title: 'Record Edit Fields/Select',
	component: SelectEdit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Select Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({
			data_type: 'enum',
			character_maximum_length: 255,
			data_type_params: ['option1', 'option2', 'option3'],
		}),
		widgetStructure: mockWidgetStructure(),
		value: 'option1',
	},
} satisfies Meta<typeof SelectEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
