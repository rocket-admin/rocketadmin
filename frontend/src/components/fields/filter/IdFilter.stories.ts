import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import IdFilter from './IdFilter.vue';

const meta = {
	title: 'Filter Fields/Id',
	component: IdFilter,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Field Label',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'int', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: 'Sample text',
	},
} satisfies Meta<typeof IdFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
export const ValidGuid: Story = { args: { value: '123e4567-e89b-12d3-a456-426614174000' } };
