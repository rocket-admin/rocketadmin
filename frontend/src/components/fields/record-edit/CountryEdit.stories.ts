import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import CountryEdit from './CountryEdit.vue';

const meta = {
	title: 'Record Edit Fields/Country',
	component: CountryEdit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Country Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: 'US',
	},
} satisfies Meta<typeof CountryEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
