import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import TimezoneEdit from './TimezoneEdit.vue';

const meta = {
	title: 'Record Edit Fields/Timezone',
	component: TimezoneEdit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Timezone Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: 'UTC',
	},
} satisfies Meta<typeof TimezoneEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
