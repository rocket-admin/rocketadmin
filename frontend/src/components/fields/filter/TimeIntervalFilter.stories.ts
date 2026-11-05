import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import TimeIntervalFilter from './TimeIntervalFilter.vue';

const meta = {
	title: 'Filter Fields/TimeInterval',
	component: TimeIntervalFilter,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Field Label',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'interval', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: '01:30:00',
	},
} satisfies Meta<typeof TimeIntervalFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
export const ParsedInterval: Story = { args: { value: '1 year 2 days 3 hours' } };
