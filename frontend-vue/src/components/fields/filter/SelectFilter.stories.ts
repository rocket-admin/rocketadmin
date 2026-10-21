import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure } from '../stories.mocks';
import SelectFilter from './SelectFilter.vue';

// Angular passed an empty widget structure too, which left mat-select with no options; without one the
// options come from `data_type_params`, as they do for an enum column with no widget.
const meta = {
	title: 'Filter Fields/Select',
	component: SelectFilter,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Field Label',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({
			data_type: 'enum',
			character_maximum_length: 255,
			data_type_params: ['option1', 'option2', 'option3'],
		}),
		widgetStructure: undefined,
		value: 'option1',
	},
} satisfies Meta<typeof SelectFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Multiple: Story = { args: { value: ['option1', 'option3'] } };
