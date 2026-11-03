import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import CountryFilter from './CountryFilter.vue';

const meta = {
	title: 'Filter Fields/Country',
	component: CountryFilter,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Field Label',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: 'US',
	},
} satisfies Meta<typeof CountryFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
