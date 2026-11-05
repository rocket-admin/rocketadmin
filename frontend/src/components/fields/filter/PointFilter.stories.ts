import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import PointFilter from './PointFilter.vue';

const meta = {
	title: 'Filter Fields/Point',
	component: PointFilter,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Field Label',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'point', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: '(40.7128, -74.0060)',
	},
} satisfies Meta<typeof PointFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
