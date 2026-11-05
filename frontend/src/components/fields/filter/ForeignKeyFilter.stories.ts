import type { Decorator, Meta, StoryObj } from '@storybook/vue3-vite';
import { useConnectionsStore } from '@/stores/connections';
import { useTablesStore } from '@/stores/tables';
import { mockRelations, mockStructure, mockWidgetStructure } from '../stories.mocks';
import ForeignKeyFilter from './ForeignKeyFilter.vue';

const customers = {
	rows: [
		{ id: 1, name: 'Ada Lovelace', email: 'ada@example.com' },
		{ id: 2, name: 'Grace Hopper', email: 'grace@example.com' },
		{ id: 3, name: 'Alan Turing', email: 'alan@example.com' },
	],
	primaryColumns: [{ column_name: 'id', data_type: 'integer' }],
	identity_column: 'name',
};

/** Answers the widget's row lookups from `customers`, so the story renders without a backend. */
const withStubbedTables: Decorator = (story) => ({
	components: { story },
	setup() {
		useConnectionsStore().connectionID = 'storybook';
		const tables = useTablesStore();
		tables.fetchTable = (({ foreignKeyRowName, foreignKeyRowValue }) => {
			const text = String(foreignKeyRowValue ?? '').toLowerCase();
			const rows =
				foreignKeyRowName === 'autocomplete'
					? customers.rows.filter((row) => row.name.toLowerCase().includes(text))
					: customers.rows.filter((row) => String(row.id) === foreignKeyRowValue);
			return Promise.resolve({ ...customers, rows });
		}) as typeof tables.fetchTable;
	},
	template: '<story />',
});

const meta = {
	title: 'Filter Fields/ForeignKey',
	component: ForeignKeyFilter,
	tags: ['autodocs'],
	decorators: [withStubbedTables],
	args: {
		fieldKey: 'field_name',
		label: 'Field Label',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'int', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		relations: mockRelations({ autocomplete_columns: ['name', 'email'] }),
		value: '1',
	},
} satisfies Meta<typeof ForeignKeyFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
