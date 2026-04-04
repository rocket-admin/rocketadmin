import { checkParsePolicySet, initSync } from '@cedar-policy/cedar-wasm/web';
import { AccessLevel, Permissions, TablePermission } from '../models/user';
import { CedarPolicyItem, permissionsToPolicyItems, policyItemsToCedarPolicy } from './cedar-policy-items';
import { canRepresentAsForm, parseCedarDashboardItems, parseCedarPolicy } from './cedar-policy-parser';

const CONNECTION_ID = 'conn-abc-123';
const GROUP_ID = 'group-xyz-789';

const AVAILABLE_TABLES: TablePermission[] = [
	{
		tableName: 'users',
		display_name: 'Users',
		accessLevel: { visibility: false, readonly: false, add: false, delete: false, edit: false },
	},
	{
		tableName: 'orders',
		display_name: 'Orders',
		accessLevel: { visibility: false, readonly: false, add: false, delete: false, edit: false },
	},
	{
		tableName: 'products',
		display_name: 'Products',
		accessLevel: { visibility: false, readonly: false, add: false, delete: false, edit: false },
	},
];

function assertValidCedar(policyText: string, label: string) {
	const result = checkParsePolicySet({
		staticPolicies: policyText,
		templates: {},
		templateLinks: [],
	});
	if (result.type !== 'success') {
		throw new Error(
			`${label}: invalid Cedar policy.\nErrors: ${JSON.stringify(result.errors)}\nPolicy:\n${policyText}`,
		);
	}
}

function roundTrip(
	cedarText: string,
	availableTables: TablePermission[] = AVAILABLE_TABLES,
): { permissions: Permissions; items: CedarPolicyItem[]; reserialized: string } {
	const permissions = parseCedarPolicy(cedarText, CONNECTION_ID, GROUP_ID, availableTables);
	const items = permissionsToPolicyItems(permissions);
	const dashboardItems = parseCedarDashboardItems(cedarText, CONNECTION_ID);
	const allItems = [...items, ...dashboardItems];
	const reserialized = policyItemsToCedarPolicy(allItems, CONNECTION_ID, GROUP_ID);
	return { permissions, items: allItems, reserialized };
}

describe('Cedar policy deserialization => serialization round-trip', () => {
	beforeAll(async () => {
		const wasmBytes = await fetch('/assets/cedar-wasm/cedar_wasm_bg.wasm').then((r) => r.arrayBuffer());
		initSync({ module: new WebAssembly.Module(wasmBytes) });
	});

	describe('connection edit policy', () => {
		const connectionEditPolicy = [
			'permit(',
			'  principal,',
			'  action == RocketAdmin::Action::"connection:edit",',
			'  resource == RocketAdmin::Connection::"conn-abc-123"',
			');',
		].join('\n');

		it('original policy should be valid Cedar', () => {
			assertValidCedar(connectionEditPolicy, 'original');
		});

		it('should round-trip to valid Cedar', () => {
			const { reserialized } = roundTrip(connectionEditPolicy);
			assertValidCedar(reserialized, 'reserialized');
		});

		it('should preserve connection edit access level', () => {
			const { permissions } = roundTrip(connectionEditPolicy);
			expect(permissions.connection.accessLevel).toBe(AccessLevel.Edit);
		});

		it('re-serialized policy should parse back to the same permissions', () => {
			const { reserialized } = roundTrip(connectionEditPolicy);
			const reparsed = parseCedarPolicy(reserialized, CONNECTION_ID, GROUP_ID, AVAILABLE_TABLES);
			const original = parseCedarPolicy(connectionEditPolicy, CONNECTION_ID, GROUP_ID, AVAILABLE_TABLES);
			expect(reparsed.connection.accessLevel).toBe(original.connection.accessLevel);
			expect(reparsed.group.accessLevel).toBe(original.group.accessLevel);
			expect(reparsed.tables).toEqual(original.tables);
		});
	});

	describe('connection read-only policy', () => {
		const connectionReadPolicy = [
			'permit(',
			'  principal,',
			'  action == RocketAdmin::Action::"connection:read",',
			'  resource == RocketAdmin::Connection::"conn-abc-123"',
			');',
		].join('\n');

		it('should round-trip to valid Cedar', () => {
			const { reserialized } = roundTrip(connectionReadPolicy);
			assertValidCedar(reserialized, 'reserialized');
		});

		it('should preserve connection readonly access level', () => {
			const { permissions } = roundTrip(connectionReadPolicy);
			expect(permissions.connection.accessLevel).toBe(AccessLevel.Readonly);
		});

		it('re-serialized policy should parse back identically', () => {
			const { reserialized } = roundTrip(connectionReadPolicy);
			const reparsed = parseCedarPolicy(reserialized, CONNECTION_ID, GROUP_ID, AVAILABLE_TABLES);
			expect(reparsed.connection.accessLevel).toBe(AccessLevel.Readonly);
		});
	});

	describe('full access (wildcard) policy', () => {
		const fullAccessPolicy = ['permit(', '  principal,', '  action,', '  resource', ');'].join('\n');

		it('should round-trip to valid Cedar', () => {
			const { reserialized } = roundTrip(fullAccessPolicy);
			assertValidCedar(reserialized, 'reserialized');
		});

		it('should parse as full access', () => {
			const { permissions } = roundTrip(fullAccessPolicy);
			expect(permissions.connection.accessLevel).toBe(AccessLevel.Edit);
			expect(permissions.group.accessLevel).toBe(AccessLevel.Edit);
			for (const table of permissions.tables) {
				expect(table.accessLevel.visibility).toBe(true);
				expect(table.accessLevel.add).toBe(true);
				expect(table.accessLevel.edit).toBe(true);
				expect(table.accessLevel.delete).toBe(true);
			}
		});

		it('re-serialized policy should parse back to full access', () => {
			const { reserialized } = roundTrip(fullAccessPolicy);
			const reparsed = parseCedarPolicy(reserialized, CONNECTION_ID, GROUP_ID, AVAILABLE_TABLES);
			expect(reparsed.connection.accessLevel).toBe(AccessLevel.Edit);
			expect(reparsed.group.accessLevel).toBe(AccessLevel.Edit);
		});
	});

	describe('group permissions policy', () => {
		const groupPolicy = [
			'permit(',
			'  principal,',
			'  action == RocketAdmin::Action::"group:read",',
			'  resource == RocketAdmin::Group::"group-xyz-789"',
			');',
			'',
			'permit(',
			'  principal,',
			'  action == RocketAdmin::Action::"group:edit",',
			'  resource == RocketAdmin::Group::"group-xyz-789"',
			');',
		].join('\n');

		it('should round-trip to valid Cedar', () => {
			const { reserialized } = roundTrip(groupPolicy);
			assertValidCedar(reserialized, 'reserialized');
		});

		it('should preserve group edit access level', () => {
			const { permissions } = roundTrip(groupPolicy);
			expect(permissions.group.accessLevel).toBe(AccessLevel.Edit);
		});

		it('re-serialized policy should parse back identically', () => {
			const { reserialized } = roundTrip(groupPolicy);
			const reparsed = parseCedarPolicy(reserialized, CONNECTION_ID, GROUP_ID, AVAILABLE_TABLES);
			expect(reparsed.group.accessLevel).toBe(AccessLevel.Edit);
		});
	});

	describe('single table read policy', () => {
		const tableReadPolicy = [
			'permit(',
			'  principal,',
			'  action == RocketAdmin::Action::"table:read",',
			'  resource == RocketAdmin::Table::"conn-abc-123/users"',
			');',
		].join('\n');

		it('should round-trip to valid Cedar', () => {
			const { reserialized } = roundTrip(tableReadPolicy);
			assertValidCedar(reserialized, 'reserialized');
		});

		it('should parse users table as visible and readonly', () => {
			const { permissions } = roundTrip(tableReadPolicy);
			const usersTable = permissions.tables.find((t) => t.tableName === 'users');
			expect(usersTable).toBeTruthy();
			expect(usersTable!.accessLevel.visibility).toBe(true);
			expect(usersTable!.accessLevel.readonly).toBe(true);
			expect(usersTable!.accessLevel.add).toBe(false);
			expect(usersTable!.accessLevel.edit).toBe(false);
			expect(usersTable!.accessLevel.delete).toBe(false);
		});

		it('other tables should have no access', () => {
			const { permissions } = roundTrip(tableReadPolicy);
			const ordersTable = permissions.tables.find((t) => t.tableName === 'orders');
			expect(ordersTable!.accessLevel.visibility).toBe(false);
			expect(ordersTable!.accessLevel.readonly).toBe(false);
		});

		it('re-serialized policy should parse back identically', () => {
			const { reserialized } = roundTrip(tableReadPolicy);
			const reparsed = parseCedarPolicy(reserialized, CONNECTION_ID, GROUP_ID, AVAILABLE_TABLES);
			const original = parseCedarPolicy(tableReadPolicy, CONNECTION_ID, GROUP_ID, AVAILABLE_TABLES);
			expect(reparsed.tables).toEqual(original.tables);
		});
	});

	describe('table full access (action in [...]) policy', () => {
		const tableFullAccessPolicy = [
			'permit(',
			'  principal,',
			'  action in [RocketAdmin::Action::"table:read", RocketAdmin::Action::"table:add", RocketAdmin::Action::"table:edit", RocketAdmin::Action::"table:delete"],',
			'  resource == RocketAdmin::Table::"conn-abc-123/orders"',
			');',
		].join('\n');

		it('should round-trip to valid Cedar', () => {
			const { reserialized } = roundTrip(tableFullAccessPolicy);
			assertValidCedar(reserialized, 'reserialized');
		});

		it('should parse orders table with full access', () => {
			const { permissions } = roundTrip(tableFullAccessPolicy);
			const ordersTable = permissions.tables.find((t) => t.tableName === 'orders');
			expect(ordersTable!.accessLevel.visibility).toBe(true);
			expect(ordersTable!.accessLevel.add).toBe(true);
			expect(ordersTable!.accessLevel.edit).toBe(true);
			expect(ordersTable!.accessLevel.delete).toBe(true);
		});

		it('re-serialized policy should parse back identically', () => {
			const { reserialized } = roundTrip(tableFullAccessPolicy);
			const reparsed = parseCedarPolicy(reserialized, CONNECTION_ID, GROUP_ID, AVAILABLE_TABLES);
			const original = parseCedarPolicy(tableFullAccessPolicy, CONNECTION_ID, GROUP_ID, AVAILABLE_TABLES);
			expect(reparsed.tables).toEqual(original.tables);
		});
	});

	describe('wildcard table permissions (all tables)', () => {
		const wildcardTablePolicy = [
			'permit(',
			'  principal,',
			'  action == RocketAdmin::Action::"table:read",',
			'  resource',
			');',
		].join('\n');

		it('should round-trip to valid Cedar', () => {
			const { reserialized } = roundTrip(wildcardTablePolicy);
			assertValidCedar(reserialized, 'reserialized');
		});

		it('should apply read to all tables', () => {
			const { permissions } = roundTrip(wildcardTablePolicy);
			for (const table of permissions.tables) {
				expect(table.accessLevel.visibility).toBe(true);
				expect(table.accessLevel.readonly).toBe(true);
			}
		});

		it('re-serialized policy should parse back identically', () => {
			const { reserialized } = roundTrip(wildcardTablePolicy);
			const reparsed = parseCedarPolicy(reserialized, CONNECTION_ID, GROUP_ID, AVAILABLE_TABLES);
			const original = parseCedarPolicy(wildcardTablePolicy, CONNECTION_ID, GROUP_ID, AVAILABLE_TABLES);
			expect(reparsed.tables).toEqual(original.tables);
		});
	});

	describe('mixed policy (connection + group + tables)', () => {
		const mixedPolicy = [
			'permit(',
			'  principal,',
			'  action == RocketAdmin::Action::"connection:read",',
			'  resource == RocketAdmin::Connection::"conn-abc-123"',
			');',
			'',
			'permit(',
			'  principal,',
			'  action == RocketAdmin::Action::"group:read",',
			'  resource == RocketAdmin::Group::"group-xyz-789"',
			');',
			'',
			'permit(',
			'  principal,',
			'  action == RocketAdmin::Action::"table:read",',
			'  resource == RocketAdmin::Table::"conn-abc-123/users"',
			');',
			'',
			'permit(',
			'  principal,',
			'  action in [RocketAdmin::Action::"table:read", RocketAdmin::Action::"table:edit"],',
			'  resource == RocketAdmin::Table::"conn-abc-123/orders"',
			');',
		].join('\n');

		it('original policy should be valid Cedar', () => {
			assertValidCedar(mixedPolicy, 'original');
		});

		it('should round-trip to valid Cedar', () => {
			const { reserialized } = roundTrip(mixedPolicy);
			assertValidCedar(reserialized, 'reserialized');
		});

		it('should preserve all access levels', () => {
			const { permissions } = roundTrip(mixedPolicy);
			expect(permissions.connection.accessLevel).toBe(AccessLevel.Readonly);
			expect(permissions.group.accessLevel).toBe(AccessLevel.Readonly);

			const usersTable = permissions.tables.find((t) => t.tableName === 'users');
			expect(usersTable!.accessLevel.visibility).toBe(true);
			expect(usersTable!.accessLevel.readonly).toBe(true);
			expect(usersTable!.accessLevel.edit).toBe(false);

			const ordersTable = permissions.tables.find((t) => t.tableName === 'orders');
			expect(ordersTable!.accessLevel.visibility).toBe(true);
			expect(ordersTable!.accessLevel.edit).toBe(true);
		});

		it('re-serialized policy should parse back to the same permissions', () => {
			const { reserialized } = roundTrip(mixedPolicy);
			const reparsed = parseCedarPolicy(reserialized, CONNECTION_ID, GROUP_ID, AVAILABLE_TABLES);
			const original = parseCedarPolicy(mixedPolicy, CONNECTION_ID, GROUP_ID, AVAILABLE_TABLES);
			expect(reparsed.connection.accessLevel).toBe(original.connection.accessLevel);
			expect(reparsed.group.accessLevel).toBe(original.group.accessLevel);
			expect(reparsed.tables).toEqual(original.tables);
		});

		it('should be representable as form', () => {
			expect(canRepresentAsForm(mixedPolicy)).toBe(true);
		});
	});

	describe('dashboard permissions policy', () => {
		const dashboardPolicy = [
			'permit(',
			'  principal,',
			'  action == RocketAdmin::Action::"dashboard:read",',
			'  resource == RocketAdmin::Dashboard::"conn-abc-123/dash-001"',
			');',
			'',
			'permit(',
			'  principal,',
			'  action == RocketAdmin::Action::"dashboard:edit",',
			'  resource == RocketAdmin::Dashboard::"conn-abc-123/dash-001"',
			');',
		].join('\n');

		it('should round-trip to valid Cedar', () => {
			const { reserialized } = roundTrip(dashboardPolicy);
			assertValidCedar(reserialized, 'reserialized');
		});

		it('should parse dashboard items correctly', () => {
			const dashboardItems = parseCedarDashboardItems(dashboardPolicy, CONNECTION_ID);
			expect(dashboardItems.length).toBe(2);
			expect(dashboardItems.some((item) => item.action === 'dashboard:read')).toBe(true);
			expect(dashboardItems.some((item) => item.action === 'dashboard:edit')).toBe(true);
			expect(dashboardItems.every((item) => item.dashboardId === 'dash-001')).toBe(true);
		});

		it('re-serialized policy should parse back to the same dashboard items', () => {
			const { reserialized } = roundTrip(dashboardPolicy);
			const originalItems = parseCedarDashboardItems(dashboardPolicy, CONNECTION_ID);
			const reparsedItems = parseCedarDashboardItems(reserialized, CONNECTION_ID);
			expect(reparsedItems).toEqual(originalItems);
		});
	});

	describe('multiple table-specific permissions', () => {
		const multiTablePolicy = [
			'permit(',
			'  principal,',
			'  action == RocketAdmin::Action::"table:read",',
			'  resource == RocketAdmin::Table::"conn-abc-123/users"',
			');',
			'',
			'permit(',
			'  principal,',
			'  action == RocketAdmin::Action::"table:add",',
			'  resource == RocketAdmin::Table::"conn-abc-123/users"',
			');',
			'',
			'permit(',
			'  principal,',
			'  action == RocketAdmin::Action::"table:read",',
			'  resource == RocketAdmin::Table::"conn-abc-123/orders"',
			');',
			'',
			'permit(',
			'  principal,',
			'  action == RocketAdmin::Action::"table:delete",',
			'  resource == RocketAdmin::Table::"conn-abc-123/orders"',
			');',
		].join('\n');

		it('should round-trip to valid Cedar', () => {
			const { reserialized } = roundTrip(multiTablePolicy);
			assertValidCedar(reserialized, 'reserialized');
		});

		it('should parse per-table permissions correctly', () => {
			const { permissions } = roundTrip(multiTablePolicy);

			const usersTable = permissions.tables.find((t) => t.tableName === 'users');
			expect(usersTable!.accessLevel.visibility).toBe(true);
			expect(usersTable!.accessLevel.add).toBe(true);
			expect(usersTable!.accessLevel.edit).toBe(false);

			const ordersTable = permissions.tables.find((t) => t.tableName === 'orders');
			expect(ordersTable!.accessLevel.visibility).toBe(true);
			expect(ordersTable!.accessLevel.delete).toBe(true);
			expect(ordersTable!.accessLevel.add).toBe(false);

			const productsTable = permissions.tables.find((t) => t.tableName === 'products');
			expect(productsTable!.accessLevel.visibility).toBe(false);
		});

		it('re-serialized policy should parse back identically', () => {
			const { reserialized } = roundTrip(multiTablePolicy);
			const reparsed = parseCedarPolicy(reserialized, CONNECTION_ID, GROUP_ID, AVAILABLE_TABLES);
			const original = parseCedarPolicy(multiTablePolicy, CONNECTION_ID, GROUP_ID, AVAILABLE_TABLES);
			expect(reparsed.tables).toEqual(original.tables);
		});
	});

	describe('canRepresentAsForm validation', () => {
		it('forbid statements should not be representable', () => {
			const policy = 'forbid(principal, action, resource);';
			expect(canRepresentAsForm(policy)).toBe(false);
		});

		it('when clauses should not be representable', () => {
			const policy = [
				'permit(',
				'  principal,',
				'  action == RocketAdmin::Action::"table:read",',
				'  resource',
				') when { principal.isAdmin };',
			].join('\n');
			expect(canRepresentAsForm(policy)).toBe(false);
		});

		it('unless clauses should not be representable', () => {
			const policy = [
				'permit(',
				'  principal,',
				'  action == RocketAdmin::Action::"table:read",',
				'  resource',
				') unless { principal.isGuest };',
			].join('\n');
			expect(canRepresentAsForm(policy)).toBe(false);
		});

		it('empty policy should be representable', () => {
			expect(canRepresentAsForm('')).toBe(true);
		});

		it('standard permit policies should be representable', () => {
			const policy = [
				'permit(',
				'  principal,',
				'  action == RocketAdmin::Action::"connection:read",',
				'  resource == RocketAdmin::Connection::"conn-abc-123"',
				');',
			].join('\n');
			expect(canRepresentAsForm(policy)).toBe(true);
		});
	});

	describe('cedar-wasm validation of all generated policies', () => {
		it('connection:read item generates valid Cedar', () => {
			const items: CedarPolicyItem[] = [{ action: 'connection:read' }];
			const policy = policyItemsToCedarPolicy(items, CONNECTION_ID, GROUP_ID);
			assertValidCedar(policy, 'connection:read');
		});

		it('connection:edit item generates valid Cedar', () => {
			const items: CedarPolicyItem[] = [{ action: 'connection:edit' }];
			const policy = policyItemsToCedarPolicy(items, CONNECTION_ID, GROUP_ID);
			assertValidCedar(policy, 'connection:edit');
		});

		it('group:read item generates valid Cedar', () => {
			const items: CedarPolicyItem[] = [{ action: 'group:read' }];
			const policy = policyItemsToCedarPolicy(items, CONNECTION_ID, GROUP_ID);
			assertValidCedar(policy, 'group:read');
		});

		it('group:edit item generates valid Cedar', () => {
			const items: CedarPolicyItem[] = [{ action: 'group:edit' }];
			const policy = policyItemsToCedarPolicy(items, CONNECTION_ID, GROUP_ID);
			assertValidCedar(policy, 'group:edit');
		});

		it('table:read with specific table generates valid Cedar', () => {
			const items: CedarPolicyItem[] = [{ action: 'table:read', tableName: 'users' }];
			const policy = policyItemsToCedarPolicy(items, CONNECTION_ID, GROUP_ID);
			assertValidCedar(policy, 'table:read specific');
		});

		it('table:* with specific table generates valid Cedar', () => {
			const items: CedarPolicyItem[] = [{ action: 'table:*', tableName: 'users' }];
			const policy = policyItemsToCedarPolicy(items, CONNECTION_ID, GROUP_ID);
			assertValidCedar(policy, 'table:* specific');
		});

		it('table:read with wildcard generates valid Cedar', () => {
			const items: CedarPolicyItem[] = [{ action: 'table:read', tableName: '*' }];
			const policy = policyItemsToCedarPolicy(items, CONNECTION_ID, GROUP_ID);
			assertValidCedar(policy, 'table:read wildcard');
		});

		it('dashboard:read with specific dashboard generates valid Cedar', () => {
			const items: CedarPolicyItem[] = [{ action: 'dashboard:read', dashboardId: 'dash-001' }];
			const policy = policyItemsToCedarPolicy(items, CONNECTION_ID, GROUP_ID);
			assertValidCedar(policy, 'dashboard:read specific');
		});

		it('dashboard:* with specific dashboard generates valid Cedar', () => {
			const items: CedarPolicyItem[] = [{ action: 'dashboard:*', dashboardId: 'dash-001' }];
			const policy = policyItemsToCedarPolicy(items, CONNECTION_ID, GROUP_ID);
			assertValidCedar(policy, 'dashboard:* specific');
		});

		it('full access (*) generates valid Cedar', () => {
			const items: CedarPolicyItem[] = [{ action: '*' }];
			const policy = policyItemsToCedarPolicy(items, CONNECTION_ID, GROUP_ID);
			assertValidCedar(policy, 'full access');
		});

		it('mixed items generate valid Cedar', () => {
			const items: CedarPolicyItem[] = [
				{ action: 'connection:read' },
				{ action: 'group:read' },
				{ action: 'group:edit' },
				{ action: 'table:read', tableName: 'users' },
				{ action: 'table:add', tableName: 'users' },
				{ action: 'table:read', tableName: '*' },
				{ action: 'dashboard:read', dashboardId: 'dash-001' },
			];
			const policy = policyItemsToCedarPolicy(items, CONNECTION_ID, GROUP_ID);
			assertValidCedar(policy, 'mixed items');
		});
	});
});
