import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import TimeIntervalEdit from './TimeIntervalEdit.vue';

const meta = {
	title: 'Record Edit Fields/TimeInterval',
	component: TimeIntervalEdit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Time Interval Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'interval', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: '01:30:00',
	},
} satisfies Meta<typeof TimeIntervalEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
