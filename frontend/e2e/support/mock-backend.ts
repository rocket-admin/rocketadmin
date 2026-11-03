// An in-memory stand-in for the RocketAdmin API. Every request the app sends to /api is answered
// here, against state that create/update/delete calls really change, so a test can add a row and
// then see it in the table. Specs read `calls` to check what was sent and use `override()` to make
// a single endpoint fail or answer differently.
import type { Page, Request, Route } from '@playwright/test';
import { createInitialState, type Doc, type MockState, type Row } from './fixtures';

export interface RecordedCall {
	method: string;
	path: string;
	query: Record<string, string>;
	body: unknown;
}

export interface HandlerContext {
	params: string[];
	query: Record<string, string>;
	// biome-ignore lint/suspicious/noExplicitAny: request bodies are whatever JSON the app sent.
	body: any;
	state: MockState;
	request: Request;
}

/** Return a value to answer 200 with it as JSON, or `reply()` for any other status or body. */
type Handler = (ctx: HandlerContext) => unknown;

class Reply {
	constructor(
		readonly status: number,
		readonly body: unknown,
		readonly contentType = 'application/json',
	) {}
}

export function reply(status: number, body: unknown = {}, contentType?: string): Reply {
	return new Reply(status, body, contentType);
}

interface RouteDef {
	method: string;
	pattern: RegExp;
	handler: Handler;
}

export class MockBackend {
	readonly state: MockState = createInitialState();
	readonly calls: RecordedCall[] = [];
	readonly unhandled: string[] = [];
	private readonly overrides: RouteDef[] = [];
	private readonly routes: RouteDef[] = [];

	constructor() {
		this.registerDefaults();
	}

	/** Answers `method path` with `handler` instead of the default; checked before the defaults. */
	override(method: string, path: string | RegExp, handler: Handler): void {
		this.overrides.unshift({ method, pattern: toPattern(path), handler });
	}

	/** Calls whose method matches and whose path starts with (or matches) `path`. */
	callsTo(method: string, path: string | RegExp): RecordedCall[] {
		return this.calls.filter(
			(call) =>
				call.method === method && (typeof path === 'string' ? call.path.startsWith(path) : path.test(call.path)),
		);
	}

	async attach(page: Page): Promise<void> {
		// Nothing leaves the machine: the dev server proxies /api to production, and analytics or
		// fonts from a CDN would make the tests slow and flaky.
		await page.route(
			(url) => url.hostname !== '127.0.0.1' && url.hostname !== 'localhost',
			(route) => route.abort(),
		);
		// Matched on the path prefix: a glob like `**/api/**` would also catch Vite's /src/api/ modules.
		await page.route(
			(url) => url.pathname.startsWith('/api/'),
			(route) => this.handle(route),
		);
	}

	private async handle(route: Route): Promise<void> {
		const request = route.request();
		const url = new URL(request.url());
		const path = url.pathname.replace(/^\/api/, '');
		const query = Object.fromEntries(url.searchParams.entries());
		const method = request.method();
		const body = parseBody(request);
		this.calls.push({ method, path, query, body });

		for (const def of [...this.overrides, ...this.routes]) {
			if (def.method !== method) continue;
			const match = def.pattern.exec(path);
			if (!match) continue;
			const result = await def.handler({
				params: match.slice(1).map(decodeURIComponent),
				query,
				body,
				state: this.state,
				request,
			});
			return fulfill(route, result);
		}

		this.unhandled.push(`${method} ${path}`);
		return fulfill(route, reply(501, { message: `Not mocked: ${method} ${path}` }));
	}

	private on(method: string, path: string, handler: Handler): void {
		this.routes.push({ method, pattern: toPattern(path), handler });
	}

	private registerDefaults(): void {
		const s = this.state;

		// --- Self-hosted setup and authentication
		this.on('GET', '/selfhosted/is-configured', () => ({ isConfigured: s.configured }));
		this.on('POST', '/selfhosted/initial-user', ({ body }) => {
			s.configured = true;
			s.user.email = body.email;
			return { id: s.user.id, email: body.email };
		});
		this.on('POST', '/user/login', ({ body }) => {
			if (body.email !== s.user.email || body.password !== s.password) {
				return reply(400, { message: 'Invalid email or password' });
			}
			return s.user.is_2fa_enabled ? { isTemporary: true } : session();
		});
		this.on('POST', '/user/otp/login', ({ body }) =>
			body.otpToken === '123456' ? session() : reply(400, { message: 'Invalid code' }),
		);
		this.on('POST', '/user/logout', () => ({}));
		this.on('GET', '/company/my/email/:p', ({ params }) =>
			params[0] === s.user.email ? [{ id: s.company.id, name: s.company.name }] : [],
		);
		this.on('POST', '/user/password/reset/request', () => ({}));
		this.on('POST', '/user/password/reset/verify/:p', ({ body }) => {
			s.password = body.password;
			return {};
		});
		this.on('POST', '/user/password/change/', ({ body }) => {
			if (body.oldPassword !== s.password) return reply(400, { message: 'Old password is incorrect' });
			s.password = body.newPassword;
			return session();
		});
		this.on('GET', '/user/email/verify/request', () => ({}));
		this.on('GET', '/user/email/verify/:p', () => session());
		this.on('GET', '/user/email/change/request', () => ({}));
		this.on('POST', '/user/email/change/verify/:p', ({ body }) => {
			s.user.email = body.email;
			return {};
		});
		this.on('GET', '/company/invite/verify/:p', () => ({ success: true }));
		this.on('POST', '/company/invite/verify/:p', () => session());

		// --- Current user
		this.on('GET', '/user', () => s.user);
		this.on('PUT', '/user/name', ({ body }) => {
			s.user.name = body.name;
			return s.user;
		});
		this.on('POST', '/user/otp/generate', () => ({
			otpauth_url: 'otpauth://totp/test',
			qrCode: 'data:image/png;base64,',
		}));
		this.on('POST', '/user/otp/verify', ({ body }) => {
			if (body.otpToken !== '123456') return reply(400, { message: 'Invalid code' });
			s.user.is_2fa_enabled = true;
			return { validated: true };
		});
		this.on('POST', '/user/otp/disable', () => {
			s.user.is_2fa_enabled = false;
			return { disabled: true };
		});
		this.on('PUT', '/user/delete', () => ({}));
		this.on('GET', '/user/settings', () => ({ userSettings: s.uiSettings }));
		this.on('POST', '/user/settings', ({ body }) => {
			s.uiSettings = body.userSettings ?? body;
			return { userSettings: s.uiSettings };
		});
		this.on('POST', '/action', () => ({}));

		// --- API keys
		this.on('GET', '/apikeys', () => s.apiKeys);
		this.on('POST', '/apikey', ({ body }) => {
			const key = { id: nextId('key'), title: body.title, hash: `sk_test_${Math.random().toString(36).slice(2)}` };
			s.apiKeys.push({ id: key.id, title: key.title });
			return key;
		});
		this.on('DELETE', '/apikey/:p', ({ params }) => {
			s.apiKeys = s.apiKeys.filter((key) => key.id !== params[0]);
			return {};
		});

		// --- Company
		this.on('GET', '/company/my/full', () => s.company);
		this.on('GET', '/company/name/:p', () => ({ name: s.company.name }));
		this.on('GET', '/company/my', () => ({ id: s.company.id, name: s.company.name }));
		this.on('GET', '/company/users/:p', () => s.companyMembers);
		this.on('PUT', '/company/name/:p', ({ body }) => {
			s.company.name = body.name;
			return {};
		});
		this.on('PUT', '/company/user/:p', ({ body }) => {
			s.company.invitations.push({
				id: nextId('inv'),
				verification_string: 'v',
				groupId: body.groupId ?? '',
				inviterId: s.user.id,
				invitedUserEmail: body.email,
				role: body.role,
				createdAt: new Date().toISOString(),
			});
			return {};
		});
		this.on('PUT', '/company/invitation/revoke/:p', ({ body }) => {
			s.company.invitations = s.company.invitations.filter((inv: Doc) => inv.invitedUserEmail !== body.email);
			return {};
		});
		this.on('PUT', '/company/users/roles/:p', ({ body }) => {
			for (const { userId, role } of body.users) {
				const member = s.companyMembers.find((m) => m.id === userId);
				if (member) member.role = role;
			}
			return {};
		});
		this.on('DELETE', '/company/:p/user/:p', ({ params }) => {
			s.companyMembers = s.companyMembers.filter((m) => m.id !== params[1]);
			return {};
		});
		this.on('PUT', '/company/users/suspend/:p', () => ({}));
		this.on('PUT', '/company/users/unsuspend/:p', () => ({}));

		// --- Connections
		this.on('GET', '/connections', () => ({
			connections: s.connections.map((connection) => ({ connection, accessLevel: 'edit' })),
			connectionsCount: s.connections.length,
		}));
		this.on('GET', '/connection/one/:p', ({ params }) => {
			const connection = s.connections.find((c) => c.id === params[0]);
			if (!connection) return reply(404, { message: 'Connection not found' });
			return {
				connection,
				accessLevel: 'edit',
				groupManagement: true,
				connectionProperties: s.connectionProperties[connection.id] ?? null,
			};
		});
		this.on('POST', '/connection/test', ({ body }) =>
			body.host === 'unreachable.example.com'
				? { result: false, message: 'getaddrinfo ENOTFOUND unreachable.example.com' }
				: { result: true, message: 'Successfully connected' },
		);
		this.on('POST', '/connection', ({ body }) => {
			const connection = { ...body, id: nextId('conn'), createdAt: new Date().toISOString() };
			delete connection.password;
			s.connections.push(connection);
			s.tables[connection.id] = structuredClone(s.tables[s.connections[0].id]);
			return connection;
		});
		this.on('PUT', '/connection/delete/:p', ({ params }) => {
			s.connections = s.connections.filter((c) => c.id !== params[0]);
			return {};
		});
		this.on('PUT', '/connection/title/:p', ({ params, body }) => {
			const connection = s.connections.find((c) => c.id === params[0]);
			if (connection) connection.title = body.title;
			return {};
		});
		this.on('PUT', '/connection/:p', ({ params, body }) => {
			const connection = s.connections.find((c) => c.id === params[0]);
			if (!connection) return reply(404, { message: 'Connection not found' });
			Object.assign(connection, body, { id: params[0] });
			return { connection };
		});
		this.on('GET', '/connection/properties/:p', ({ params }) => s.connectionProperties[params[0]] ?? null);
		for (const method of ['POST', 'PUT']) {
			this.on(method, '/connection/properties/:p', ({ params, body }) => {
				s.connectionProperties[params[0]] = { ...body, connectionId: params[0], id: 'props-1' };
				return s.connectionProperties[params[0]];
			});
		}
		this.on('DELETE', '/connection/properties/:p', ({ params }) => {
			delete s.connectionProperties[params[0]];
			return {};
		});
		this.on('GET', '/connection/diagram/:p', () => ({ diagram: s.diagram }));
		this.on('GET', '/logs/:p', () => ({
			logs: s.logs,
			pagination: { total: s.logs.length, lastPage: 1, perPage: 30, currentPage: 1 },
		}));

		// --- Users, groups and permissions
		this.on('GET', '/connection/groups/:p', () => s.groups.map((group) => ({ group, accessLevel: 'edit' })));
		this.on('GET', '/connection/users/:p', () => s.companyMembers);
		this.on('GET', '/group/users/:p', ({ params }) => s.groups.find((g) => g.id === params[0])?.users ?? []);
		this.on('POST', '/connection/group/:p', ({ body }) => {
			const group = {
				id: nextId('group'),
				title: body.title,
				isMain: false,
				cedarPolicy: body.cedarPolicy ?? null,
				users: [],
			};
			s.groups.push(group);
			return group;
		});
		this.on('PUT', '/group/title', ({ body }) => {
			const group = s.groups.find((g) => g.id === body.groupId);
			if (group) group.title = body.title;
			return {};
		});
		this.on('DELETE', '/group/:p', ({ params }) => {
			s.groups = s.groups.filter((g) => g.id !== params[0]);
			return {};
		});
		this.on('PUT', '/group/user', ({ body }) => {
			const group = s.groups.find((g) => g.id === body.groupId);
			const member = s.companyMembers.find((m) => m.email === body.email);
			if (group && member) group.users.push({ ...member, createdAt: new Date().toISOString(), gclid: null });
			return {};
		});
		this.on('PUT', '/group/user/delete', ({ body }) => {
			const group = s.groups.find((g) => g.id === body.groupId);
			if (group) group.users = group.users.filter((u: Doc) => u.email !== body.email);
			return {};
		});
		this.on('GET', '/connection/permissions', ({ query }) => permissionsFor(s, query.groupId));
		this.on('PUT', '/permissions/:p', ({ body }) => body);
		this.on('PUT', '/connection/cedar-policy/:p', ({ body }) => {
			const group = s.groups.find((g) => g.id === body.groupId);
			if (group) group.cedarPolicy = body.cedarPolicy;
			return {};
		});
		this.on('GET', '/connection/public-permissions/:p', () => s.publicPermissions);
		this.on('PUT', '/connection/public-permissions/:p', ({ body }) => {
			s.publicPermissions = body;
			return body;
		});
		this.on('GET', '/permissions/available', () => ({
			actions: [
				{ value: 'connection:read', resource: 'connection' },
				{ value: 'connection:edit', resource: 'connection' },
				{ value: 'group:read', resource: 'group' },
				{ value: 'group:edit', resource: 'group' },
				{ value: 'table:read', resource: 'table' },
				{ value: 'table:add', resource: 'table' },
				{ value: 'table:edit', resource: 'table' },
				{ value: 'table:delete', resource: 'table' },
			],
		}));

		// --- AI auto-configuration: an NDJSON progress stream
		this.on('GET', '/ai/v2/setup/:p', () =>
			reply(
				200,
				[
					{ type: 'message', text: 'Analyzing customers' },
					{ type: 'message', text: 'Analyzing orders' },
					{ type: 'complete' },
				]
					.map((event) => JSON.stringify(event))
					.join('\n'),
				'application/x-ndjson',
			),
		);

		// --- Tables
		this.on('GET', '/connection/tables/:p', ({ params }) =>
			Object.entries(s.tables[params[0]] ?? {}).map(([table, def]) => ({
				table,
				display_name: def.displayName,
				permissions: { visibility: true, readonly: false, add: true, delete: true, edit: true },
			})),
		);
		this.on('GET', '/table-categories/v2/:p', ({ params }) => [
			{
				category_id: 'all-tables-kitten',
				category_name: 'All tables',
				tables: Object.entries(s.tables[params[0]] ?? {}).map(([table, def]) => ({
					table,
					display_name: def.displayName,
					permissions: { visibility: true, readonly: false, add: true, delete: true, edit: true },
				})),
			},
			...(s.connectionProperties[params[0]]?.table_categories ?? []).map((category: Doc) => ({
				...category,
				tables: category.tables.map((table: string) => ({
					table,
					display_name: s.tables[params[0]]?.[table]?.displayName,
					permissions: { visibility: true, readonly: false, add: true, delete: true, edit: true },
				})),
			})),
		]);
		this.on('PUT', '/table-categories/:p', ({ params, body }) => {
			s.connectionProperties[params[0]] = { ...(s.connectionProperties[params[0]] ?? {}), table_categories: body };
			return body;
		});
		this.on('POST', '/table/rows/find/:p', ({ params, query, body }) => {
			const table = s.tables[params[0]]?.[query.tableName];
			if (!table) return reply(404, { message: `Table "${query.tableName}" not found` });
			let rows = [...table.rows];
			if (query.search) {
				const needle = query.search.toLowerCase();
				rows = rows.filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(needle)));
			}
			rows = applyFilters(rows, query, body?.filters);
			if (query.sort_by) {
				const direction = query.sort_order === 'DESC' ? -1 : 1;
				rows.sort(
					(a, b) =>
						String(a[query.sort_by]).localeCompare(String(b[query.sort_by]), 'en', { numeric: true }) * direction,
				);
			}
			const perPage = Number(query.perPage) || 30;
			const page = Number(query.page) || 1;
			return {
				rows: rows.slice((page - 1) * perPage, page * perPage),
				...structureOf(s, params[0], query.tableName),
				widgets: table.widgets,
				pagination: {
					total: rows.length,
					lastPage: Math.max(1, Math.ceil(rows.length / perPage)),
					perPage,
					currentPage: page,
				},
				table_settings: {
					list_fields: [],
					columns_view: [],
					ordering: 'ASC',
					ordering_field: '',
					...((s.tableSettings[`${params[0]}/${query.tableName}`] as object) ?? {}),
				},
				sortable_by: [],
				list_fields: [],
				identity_column: '',
				configured: true,
				action_events: s.rules
					.filter((r) => r.connectionId === params[0] && r.table_name === query.tableName)
					.flatMap((r) => r.events ?? []),
				allow_csv_export: true,
				allow_csv_import: true,
				can_delete: true,
				can_update: true,
				can_add: true,
				excluded_fields: [],
				readonly_fields: [],
				columns_view: [],
				list_per_page: perPage,
				table_permissions: { visibility: true, readonly: false, add: true, delete: true, edit: true },
				large_dataset: false,
			};
		});
		this.on('GET', '/table/structure/:p', ({ params, query }) => {
			if (!s.tables[params[0]]?.[query.tableName]) return reply(404, { message: 'Table not found' });
			return {
				...structureOf(s, params[0], query.tableName),
				readonly_fields: [],
				table_widgets: s.tables[params[0]][query.tableName].widgets,
				excluded_fields: [],
				list_fields: [],
			};
		});
		this.on('GET', '/table/row/:p', ({ params, query }) => {
			const table = s.tables[params[0]]?.[query.tableName];
			const row = table?.rows.find((r) => String(r.id) === query.id);
			if (!row) return reply(404, { message: 'Row not found' });
			return {
				row,
				...structureOf(s, params[0], query.tableName),
				table_widgets: table.widgets,
				readonly_fields: [],
				referenced_table_names_and_columns: table.referencedBy,
			};
		});
		this.on('POST', '/table/row/:p', ({ params, query, body }) => {
			const table = s.tables[params[0]][query.tableName];
			const row = { ...body, id: Math.max(0, ...table.rows.map((r) => Number(r.id))) + 1 };
			table.rows.push(row);
			return { row, ...structureOf(s, params[0], query.tableName), table_widgets: table.widgets, readonly_fields: [] };
		});
		this.on('PUT', '/table/row/:p', ({ params, query, body }) => {
			const table = s.tables[params[0]][query.tableName];
			const row = table.rows.find((r) => String(r.id) === query.id);
			if (!row) return reply(404, { message: 'Row not found' });
			Object.assign(row, body);
			return { row, ...structureOf(s, params[0], query.tableName), table_widgets: table.widgets, readonly_fields: [] };
		});
		this.on('DELETE', '/table/row/:p', ({ params, query }) => {
			const table = s.tables[params[0]][query.tableName];
			table.rows = table.rows.filter((r) => String(r.id) !== query.id);
			return {};
		});
		this.on('PUT', '/table/rows/delete/:p', ({ params, query, body }) => {
			const table = s.tables[params[0]][query.tableName];
			const ids = new Set((body as Row[]).map((key) => String(key.id)));
			table.rows = table.rows.filter((r) => !ids.has(String(r.id)));
			return {};
		});
		this.on('POST', '/table/csv/export/:p', ({ params, query }) => {
			const rows = s.tables[params[0]][query.tableName].rows;
			const header = Object.keys(rows[0] ?? {});
			const csv = [header.join(','), ...rows.map((row) => header.map((h) => row[h]).join(','))].join('\n');
			return reply(200, csv, 'text/csv');
		});
		this.on('POST', '/table/csv/import/:p', () => ({}));

		// --- Table settings, widgets, actions, filters
		this.on('GET', '/settings', ({ query }) => s.tableSettings[`${query.connectionId}/${query.tableName}`] ?? null);
		for (const method of ['POST', 'PUT']) {
			this.on(method, '/settings', ({ query, body }) => {
				s.tableSettings[`${query.connectionId}/${query.tableName}`] = body;
				return body;
			});
		}
		this.on('DELETE', '/settings', ({ query }) => {
			delete s.tableSettings[`${query.connectionId}/${query.tableName}`];
			return {};
		});
		this.on('PUT', '/settings/personal/:p', ({ body }) => body);
		this.on('GET', '/widgets/:p', ({ params, query }) => s.tables[params[0]]?.[query.tableName]?.widgets ?? []);
		this.on('POST', '/widget/:p', ({ params, query, body }) => {
			s.tables[params[0]][query.tableName].widgets = body.widgets;
			return body.widgets;
		});
		this.on('GET', '/action/rules/:p', ({ params, query }) => ({
			action_rules: s.rules.filter((r) => r.connectionId === params[0] && r.table_name === query.tableName),
		}));
		this.on('POST', '/action/rule/:p', ({ params, body }) => {
			const rule = { ...body, id: nextId('rule'), connectionId: params[0] };
			s.rules.push(rule);
			return rule;
		});
		this.on('PUT', '/action/rule/:p/:p', ({ params, body }) => {
			const index = s.rules.findIndex((r) => r.id === params[0]);
			s.rules[index] = { ...s.rules[index], ...body, id: params[0] };
			return s.rules[index];
		});
		this.on('DELETE', '/action/rule/:p/:p', ({ params }) => {
			const rule = s.rules.find((r) => r.id === params[0]);
			s.rules = s.rules.filter((r) => r.id !== params[0]);
			return rule;
		});
		this.on('POST', '/event/actions/activate/:p/:p', () => ({}));
		this.on('GET', '/table-filters/:p/all', ({ query }) =>
			s.savedFilters.filter((f) => f.table_name === query.tableName),
		);
		this.on('POST', '/table-filters/:p', ({ query, body }) => {
			const filter = { ...body, id: nextId('filter'), table_name: query.tableName };
			s.savedFilters.push(filter);
			return filter;
		});
		this.on('PUT', '/table-filters/:p/:p', ({ params, body }) => {
			const filter = s.savedFilters.find((f) => f.id === params[1]);
			Object.assign(filter ?? {}, body);
			return filter;
		});
		this.on('DELETE', '/table-filters/:p/:p', ({ params }) => {
			s.savedFilters = s.savedFilters.filter((f) => f.id !== params[1]);
			return {};
		});

		// --- Saved queries (panels) and dashboards
		this.on('GET', '/connection/:p/saved-queries', () => s.savedQueries);
		this.on('GET', '/connection/:p/saved-query/:p', ({ params }) => s.savedQueries.find((q) => q.id === params[1]));
		this.on('POST', '/connection/:p/saved-query', ({ params, body }) => {
			const query = {
				...body,
				id: nextId('query'),
				connection_id: params[0],
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};
			s.savedQueries.push(query);
			return query;
		});
		this.on('PUT', '/connection/:p/saved-query/:p', ({ params, body }) => {
			const query = s.savedQueries.find((q) => q.id === params[1]);
			Object.assign(query ?? {}, body);
			return query;
		});
		this.on('DELETE', '/connection/:p/saved-query/:p', ({ params }) => {
			const query = s.savedQueries.find((q) => q.id === params[1]);
			s.savedQueries = s.savedQueries.filter((q) => q.id !== params[1]);
			return query;
		});
		this.on('POST', '/connection/:p/query/test', () => queryResult());
		this.on('POST', '/connection/:p/saved-query/:p/execute', () => queryResult());
		this.on('GET', '/dashboards/:p', () => s.dashboards);
		this.on('POST', '/dashboards/:p', ({ params, body }) => {
			const dashboard = {
				...body,
				id: nextId('dash'),
				connection_id: params[0],
				widgets: [],
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};
			s.dashboards.push(dashboard);
			return dashboard;
		});
		this.on(
			'GET',
			'/dashboard/:p/:p',
			({ params }) => s.dashboards.find((d) => d.id === params[0]) ?? reply(404, { message: 'Dashboard not found' }),
		);
		this.on('PUT', '/dashboard/:p/:p', ({ params, body }) => {
			const dashboard = s.dashboards.find((d) => d.id === params[0]);
			Object.assign(dashboard ?? {}, body);
			return dashboard;
		});
		this.on('DELETE', '/dashboard/:p/:p', ({ params }) => {
			const dashboard = s.dashboards.find((d) => d.id === params[0]);
			s.dashboards = s.dashboards.filter((d) => d.id !== params[0]);
			return dashboard;
		});
		this.on('POST', '/dashboard/:p/widget/:p', ({ params, body }) => {
			const widget = { ...body, id: nextId('widget'), dashboard_id: params[0] };
			s.dashboards.find((d) => d.id === params[0])?.widgets.push(widget);
			return widget;
		});
		this.on('PUT', '/dashboard/:p/widget/:p/:p', ({ params, body }) => {
			const widget = s.dashboards.find((d) => d.id === params[0])?.widgets.find((w: Doc) => w.id === params[1]);
			Object.assign(widget ?? {}, body);
			return widget;
		});
		this.on('DELETE', '/dashboard/:p/widget/:p/:p', ({ params }) => {
			const dashboard = s.dashboards.find((d) => d.id === params[0]);
			if (dashboard) dashboard.widgets = dashboard.widgets.filter((w: Doc) => w.id !== params[1]);
			return {};
		});

		// --- Secrets
		this.on('GET', '/secrets', () => ({
			data: s.secrets,
			pagination: { total: s.secrets.length, currentPage: 1, perPage: 20, totalPages: 1 },
		}));
		this.on('POST', '/secrets', ({ body }) => {
			const secret = {
				id: nextId('secret'),
				slug: body.slug,
				companyId: s.company.id,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				lastAccessedAt: null,
				expiresAt: body.expiresAt ?? null,
				masterEncryption: !!body.masterEncryption,
			};
			s.secrets.push(secret);
			return secret;
		});
		this.on('PUT', '/secrets/:p', ({ params, body }) => {
			const secret = s.secrets.find((x) => x.slug === params[0]);
			Object.assign(secret ?? {}, { expiresAt: body.expiresAt ?? null, updatedAt: new Date().toISOString() });
			return secret;
		});
		this.on('DELETE', '/secrets/:p', ({ params }) => {
			s.secrets = s.secrets.filter((x) => x.slug !== params[0]);
			return { success: true, deletedAt: new Date().toISOString() };
		});
		this.on('GET', '/secrets/:p/audit-log', () => ({
			data: [],
			pagination: { total: 0, currentPage: 1, perPage: 20, totalPages: 0 },
		}));
	}
}

function toPattern(path: string | RegExp): RegExp {
	if (path instanceof RegExp) return path;
	const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:p/g, '([^/]+)');
	return new RegExp(`^${escaped}/?$`);
}

function parseBody(request: Request): unknown {
	const raw = request.postData();
	if (!raw) return undefined;
	try {
		return JSON.parse(raw);
	} catch {
		return raw;
	}
}

function fulfill(route: Route, result: unknown): Promise<void> {
	if (result instanceof Reply) {
		return route.fulfill({
			status: result.status,
			contentType: result.contentType,
			body: typeof result.body === 'string' ? result.body : JSON.stringify(result.body),
		});
	}
	return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result ?? null) });
}

function session() {
	return { expires: new Date(Date.now() + 24 * 3_600_000).toISOString() };
}

let idCounter = 0;
function nextId(prefix: string): string {
	idCounter += 1;
	return `${prefix}-${idCounter}`;
}

function structureOf(state: MockState, connectionId: string, tableName: string) {
	const table = state.tables[connectionId][tableName];
	return {
		structure: table.structure,
		primaryColumns: [{ column_name: 'id', data_type: 'integer' }],
		foreignKeys: table.foreignKeys,
	};
}

function permissionsFor(state: MockState, groupId: string) {
	const connectionId = state.connections[0].id;
	return {
		connection: { connectionId, accessLevel: 'edit' },
		group: { groupId, accessLevel: 'edit' },
		tables: Object.entries(state.tables[connectionId]).map(([tableName, def]) => ({
			tableName,
			display_name: def.displayName ?? tableName,
			accessLevel: { visibility: true, readonly: false, add: true, delete: true, edit: true },
		})),
	};
}

/** Applies `f_<column>__<op>` query params and body filters ({ column: { op: value } }). */
function applyFilters(
	rows: Row[],
	query: Record<string, string>,
	filters: Record<string, Record<string, unknown>> | undefined,
): Row[] {
	const conditions: [string, string, unknown][] = [];
	for (const [key, value] of Object.entries(query)) {
		const match = /^f_(.+)__(\w+)$/.exec(key);
		if (match) conditions.push([match[1], match[2], value]);
	}
	for (const [column, ops] of Object.entries(filters ?? {})) {
		for (const [op, value] of Object.entries(ops ?? {})) conditions.push([column, op, value]);
	}
	return rows.filter((row) =>
		conditions.every(([column, op, value]) => {
			const cell = row[column];
			switch (op) {
				case 'eq':
					return String(cell) === String(value);
				case 'contains':
					return String(cell).toLowerCase().includes(String(value).toLowerCase());
				case 'gt':
					return Number(cell) > Number(value);
				case 'lt':
					return Number(cell) < Number(value);
				default:
					return true;
			}
		}),
	);
}

function queryResult() {
	return {
		data: [
			{ status: 'paid', count: 3 },
			{ status: 'pending', count: 2 },
		],
		execution_time_ms: 4,
	};
}
