import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import BinaryDataCaptionFilter from './BinaryDataCaptionFilter.vue';

const meta = {
	title: 'Filter Fields/BinaryDataCaption',
	component: BinaryDataCaptionFilter,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Field Label',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'bytea', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
	},
} satisfies Meta<typeof BinaryDataCaptionFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
