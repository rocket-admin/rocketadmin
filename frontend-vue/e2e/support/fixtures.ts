// Seed data for the mock backend: one self-hosted company with an admin, a Postgres connection
// holding `customers` and `orders`, and a little of everything else. Each test gets a fresh copy.
export type Row = Record<string, unknown>;

/** A loosely shaped JSON document, as the API sends and receives them. */
// biome-ignore lint/suspicious/noExplicitAny: mock records are free-form JSON the specs reach into.
export type Doc = Record<string, any>;

export interface MockTable {
	displayName?: string;
	structure: Record<string, unknown>[];
	foreignKeys: Record<string, unknown>[];
	widgets: Record<string, unknown>[];
	referencedBy: Record<string, unknown>[];
	rows: Row[];
}

export const ADMIN_EMAIL = 'ada@example.com';
export const ADMIN_PASSWORD = 'Correct-horse-42';
export const CONNECTION_ID = 'conn-shop';
export const COMPANY_ID = 'company-1';

function column(column_name: string, data_type: string, extra: Partial<Record<string, unknown>> = {}) {
	return {
		column_name,
		column_default: null,
		data_type,
		isExcluded: false,
		isSearched: false,
		allow_null: true,
		auto_increment: false,
		character_maximum_length: null,
		...extra,
	};
}

export function createInitialState() {
	const user = {
		id: 'user-ada',
		isActive: true,
		email: ADMIN_EMAIL,
		name: 'Ada Admin',
		createdAt: '2025-01-01T00:00:00.000Z',
		subscriptionLevel: 'ENTERPRISE_PLAN',
		is_2fa_enabled: false,
		role: 'ADMIN',
		externalRegistrationProvider: null as string | null,
		company: { id: COMPANY_ID },
	};

	const connections: Doc[] = [
		{
			id: CONNECTION_ID,
			title: 'Shop DB',
			type: 'postgres',
			host: 'db.example.com',
			port: '5432',
			database: 'shop',
			username: 'shop_admin',
			sid: null,
			schema: '',
			ssh: false,
			ssl: false,
			cert: '',
			masterEncryption: false,
			azure_encryption: false,
			isTestConnection: false,
			createdAt: '2025-01-02T00:00:00.000Z',
			updatedAt: '2025-01-02T00:00:00.000Z',
		},
	];

	const customers: MockTable = {
		displayName: 'Customers',
		structure: [
			column('id', 'integer', {
				allow_null: false,
				auto_increment: true,
				column_default: "nextval('customers_id_seq')",
			}),
			column('name', 'character varying', { allow_null: false, character_maximum_length: 255 }),
			column('email', 'character varying', { character_maximum_length: 255 }),
			column('is_vip', 'boolean'),
		],
		foreignKeys: [],
		widgets: [],
		referencedBy: [
			{ referenced_on_column_name: 'id', referenced_by: [{ table_name: 'orders', column_name: 'customer_id' }] },
		],
		rows: [
			{ id: 1, name: 'Grace Hopper', email: 'grace@example.com', is_vip: true },
			{ id: 2, name: 'Alan Turing', email: 'alan@example.com', is_vip: false },
			{ id: 3, name: 'Katherine Johnson', email: 'katherine@example.com', is_vip: false },
		],
	};

	const orders: MockTable = {
		displayName: 'Orders',
		structure: [
			column('id', 'integer', { allow_null: false, auto_increment: true, column_default: "nextval('orders_id_seq')" }),
			column('customer_id', 'integer'),
			column('total', 'numeric'),
			column('status', 'character varying', { character_maximum_length: 32 }),
		],
		foreignKeys: [
			{
				column_name: 'customer_id',
				constraint_name: 'orders_customer_id_fkey',
				referenced_column_name: 'id',
				referenced_table_name: 'customers',
			},
		],
		widgets: [],
		referencedBy: [],
		rows: [
			{ id: 1, customer_id: 1, total: '120.50', status: 'paid' },
			{ id: 2, customer_id: 2, total: '42.00', status: 'pending' },
			{ id: 3, customer_id: 1, total: '9.99', status: 'paid' },
		],
	};

	const companyMembers: Doc[] = [
		{
			id: user.id,
			isActive: true,
			name: user.name,
			email: user.email,
			role: 'ADMIN',
			has_groups: true,
			user_membership: [],
			suspended: false,
			is_2fa_enabled: false,
			externalRegistrationProvider: null,
		},
		{
			id: 'user-bob',
			isActive: true,
			name: 'Bob Builder',
			email: 'bob@example.com',
			role: 'USER',
			has_groups: false,
			user_membership: [],
			suspended: false,
			is_2fa_enabled: false,
			externalRegistrationProvider: null,
		},
	];

	return {
		configured: true,
		password: ADMIN_PASSWORD,
		user,
		uiSettings: {
			globalSettings: { connectionsListCollapsed: false, lastFeatureNotificationId: '' },
			connections: {},
		} as Record<string, unknown>,
		apiKeys: [{ id: 'key-existing', title: 'CI pipeline' }] as { id: string; title: string }[],
		company: {
			id: COMPANY_ID,
			name: 'Analytical Engines Ltd',
			additional_info: '',
			address: {},
			subscriptionLevel: 'ENTERPRISE_PLAN',
			portal_link: '',
			show_test_connections: false,
			is_payment_method_added: true,
			connections: [
				{
					id: CONNECTION_ID,
					createdAt: '2025-01-02T00:00:00.000Z',
					updatedAt: '2025-01-02T00:00:00.000Z',
					title: 'Shop DB',
					author: user,
					groups: [{ id: 'group-admin', title: 'Admin', isMain: true, users: companyMembers }],
				},
			],
			invitations: [] as Doc[],
		} as Doc,
		companyMembers,
		connections,
		connectionProperties: {} as Doc,
		tables: { [CONNECTION_ID]: { customers, orders } } as Record<string, Record<string, MockTable>>,
		tableSettings: {} as Record<string, unknown>,
		groups: [
			{
				id: 'group-admin',
				title: 'Admin',
				isMain: true,
				// What the backend gives a connection's main group (generateCedarPolicyForGroup).
				cedarPolicy: 'permit(\n  principal,\n  action,\n  resource\n);',
				users: [{ ...companyMembers[0], createdAt: '2025-01-01T00:00:00.000Z', gclid: null }],
			},
		] as Doc[],
		publicPermissions: { enabled: false, tables: [] } as Record<string, unknown>,
		rules: [] as Doc[],
		savedFilters: [] as Doc[],
		savedQueries: [
			{
				id: 'query-status',
				connection_id: CONNECTION_ID,
				name: 'Orders by status',
				description: 'How many orders are in each status',
				query_text: 'SELECT status, COUNT(*) AS count FROM orders GROUP BY status',
				widget_type: 'table',
				widget_options: null,
				created_at: '2025-01-03T00:00:00.000Z',
				updated_at: '2025-01-03T00:00:00.000Z',
			},
		] as Doc[],
		dashboards: [
			{
				id: 'dash-sales',
				name: 'Sales overview',
				description: 'Daily numbers',
				connection_id: CONNECTION_ID,
				widgets: [] as Doc[],
				created_at: '2025-01-03T00:00:00.000Z',
				updated_at: '2025-01-03T00:00:00.000Z',
			},
		] as Doc[],
		secrets: [
			{
				id: 'secret-1',
				slug: 'stripe-api-key',
				companyId: COMPANY_ID,
				createdAt: '2025-01-04T00:00:00.000Z',
				updatedAt: '2025-01-04T00:00:00.000Z',
				lastAccessedAt: null,
				expiresAt: null,
				masterEncryption: false,
			},
		] as Doc[],
		logs: [
			{
				id: 'log-1',
				table_name: 'customers',
				received_data: { id: 1, name: 'Grace Hopper' },
				old_data: null,
				operationType: 'addRow',
				operationStatusResult: 'successfully',
				createdAt: '2025-01-05T10:00:00.000Z',
				email: ADMIN_EMAIL,
				affected_primary_key: { id: 1 },
			},
		] as Doc[],
		diagram: '',
	};
}

export type MockState = ReturnType<typeof createInitialState>;
