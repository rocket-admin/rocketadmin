import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { useConnectionsStore } from '@/stores/connections';
import { useTablesStore } from '@/stores/tables';
import { mockRelations, mockStructure, mockWidgetStructure } from '../stories.mocks';
import ForeignKeyEdit from './ForeignKeyEdit.vue';

const customers = {
	rows: [
		{ id: 1, name: 'Ada Lovelace', email: 'ada@example.com' },
		{ id: 2, name: 'Alan Turing', email: 'alan@example.com' },
		{ id: 3, name: 'Grace Hopper', email: 'grace@example.com' },
	],
	primaryColumns: [{ column_name: 'id', data_type: 'integer' }],
	identity_column: 'name',
};

/** Answers the widget's row lookups locally, so the story renders without a backend. */
const stubTables = () => ({
	setup() {
		useConnectionsStore().connectionID = 'storybook-connection';
		const tables = useTablesStore();
		tables.fetchTable = <T>({
			foreignKeyRowName,
			foreignKeyRowValue,
		}: {
			foreignKeyRowName?: string;
			foreignKeyRowValue?: string;
		}) => {
			const query = (foreignKeyRowValue ?? '').toLowerCase();
			const rows =
				foreignKeyRowName === 'autocomplete'
					? customers.rows.filter((row) => row.name.toLowerCase().includes(query))
					: customers.rows.filter((row) => String(row.id) === foreignKeyRowValue);
			return Promise.resolve({ ...customers, rows } as unknown as T);
		};
	},
	template: '<story />',
});

const meta = {
	title: 'Record Edit Fields/ForeignKey',
	component: ForeignKeyEdit,
	tags: ['autodocs'],
	decorators: [stubTables],
	args: {
		fieldKey: 'field_name',
		label: 'Foreign Key Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'int', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		relations: mockRelations({ autocomplete_columns: ['name', 'email'] }),
		value: '1',
	},
} satisfies Meta<typeof ForeignKeyEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
