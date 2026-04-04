import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { User, UserGroupInfo } from '../models/user';
import { CedarPermissionService } from './cedar-permission.service';
import { CedarWasmService } from './cedar-wasm.service';
import { UserService } from './user.service';
import { UsersService } from './users.service';

const CONN_ID = 'conn-abc';
const USER_ID = 'user-1';

function makeGroup(id: string, cedarPolicy: string | null, userIds: string[]): UserGroupInfo {
	return {
		group: {
			id,
			title: `Group ${id}`,
			isMain: false,
			cedarPolicy,
			users: userIds.map((uid) => ({
				id: uid,
				isActive: true,
				email: `${uid}@test.com`,
				name: uid,
				is_2fa_enabled: false,
				role: 'MEMBER' as never,
			})),
		},
		accessLevel: 'edit',
	};
}

function permitPolicy(action: string, resourceType: string, resourceId: string): string {
	return [
		'permit(',
		'  principal,',
		`  action == RocketAdmin::Action::"${action}",`,
		`  resource == RocketAdmin::${resourceType}::"${resourceId}"`,
		');',
	].join('\n');
}

describe('CedarPermissionService', () => {
	let service: CedarPermissionService;
	let groupsSignal: WritableSignal<UserGroupInfo[]>;
	let userSubject: BehaviorSubject<User | null>;
	let mockIsAuthorized: ReturnType<typeof vi.fn>;
	let mockIsAuthorizedPartial: ReturnType<typeof vi.fn>;
	let wasmLoaded: () => void;

	beforeEach(() => {
		groupsSignal = signal<UserGroupInfo[]>([]);
		userSubject = new BehaviorSubject<User | null>(null);

		mockIsAuthorized = vi.fn().mockReturnValue({
			type: 'success',
			response: { decision: 'deny', diagnostics: { reason: [], errors: [] } },
			warnings: [],
		});

		mockIsAuthorizedPartial = vi.fn().mockReturnValue({
			type: 'residuals',
			response: { decision: 'deny', satisfied: [], errored: [], mayBeDetermining: [], mustBeDetermining: [] },
			warnings: [],
		});

		let resolveWasm: (mod: unknown) => void;
		const wasmPromise = new Promise<unknown>((resolve) => {
			resolveWasm = resolve;
		});
		wasmLoaded = () =>
			resolveWasm!({
				isAuthorized: mockIsAuthorized,
				isAuthorizedPartial: mockIsAuthorizedPartial,
				checkParsePolicySet: vi.fn(),
			});

		TestBed.configureTestingModule({
			providers: [
				CedarPermissionService,
				{
					provide: CedarWasmService,
					useValue: { load: () => wasmPromise },
				},
				{
					provide: UserService,
					useValue: { cast: userSubject.asObservable() },
				},
				{
					provide: UsersService,
					useValue: { groups: groupsSignal.asReadonly() },
				},
			],
		});

		service = TestBed.inject(CedarPermissionService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('canI signal returns null when WASM not loaded', () => {
		userSubject.next({ id: USER_ID } as User);
		groupsSignal.set([makeGroup('g1', permitPolicy('connection:read', 'Connection', CONN_ID), [USER_ID])]);

		const sig = service.canI('connection:read', 'Connection', CONN_ID);
		expect(sig()).toBe(null);
	});

	it('canI signal returns null when no user', async () => {
		wasmLoaded();
		await TestBed.inject(CedarWasmService).load();

		groupsSignal.set([makeGroup('g1', permitPolicy('connection:read', 'Connection', CONN_ID), [USER_ID])]);

		const sig = service.canI('connection:read', 'Connection', CONN_ID);
		expect(sig()).toBe(null);
		expect(mockIsAuthorized).not.toHaveBeenCalled();
	});

	it('canI signal returns null when user has no groups', async () => {
		wasmLoaded();
		await TestBed.inject(CedarWasmService).load();
		userSubject.next({ id: USER_ID } as User);

		const sig = service.canI('connection:read', 'Connection', CONN_ID);
		expect(sig()).toBe(null);
		expect(mockIsAuthorized).not.toHaveBeenCalled();
	});

	it('canI signal returns true when policy permits the action', async () => {
		wasmLoaded();
		await TestBed.inject(CedarWasmService).load();
		userSubject.next({ id: USER_ID } as User);
		groupsSignal.set([makeGroup('g1', permitPolicy('connection:read', 'Connection', CONN_ID), [USER_ID])]);

		mockIsAuthorized.mockReturnValue({
			type: 'success',
			response: { decision: 'allow', diagnostics: { reason: ['policy0'], errors: [] } },
			warnings: [],
		});

		const sig = service.canI('connection:read', 'Connection', CONN_ID);
		expect(sig()).toBe(true);
		expect(mockIsAuthorized).toHaveBeenCalledWith(
			expect.objectContaining({
				principal: { type: 'RocketAdmin::User', id: USER_ID },
				action: { type: 'RocketAdmin::Action', id: 'connection:read' },
				resource: { type: 'RocketAdmin::Connection', id: CONN_ID },
			}),
		);
	});

	it('canI signal returns false when policy denies the action', async () => {
		wasmLoaded();
		await TestBed.inject(CedarWasmService).load();
		userSubject.next({ id: USER_ID } as User);
		groupsSignal.set([makeGroup('g1', permitPolicy('connection:read', 'Connection', CONN_ID), [USER_ID])]);

		mockIsAuthorized.mockReturnValue({
			type: 'success',
			response: { decision: 'deny', diagnostics: { reason: [], errors: [] } },
			warnings: [],
		});

		const sig = service.canI('connection:edit', 'Connection', CONN_ID);
		expect(sig()).toBe(false);
	});

	it('merges policies from multiple groups', async () => {
		wasmLoaded();
		await TestBed.inject(CedarWasmService).load();
		userSubject.next({ id: USER_ID } as User);

		const policy1 = permitPolicy('connection:read', 'Connection', CONN_ID);
		const policy2 = permitPolicy('table:read', 'Table', `${CONN_ID}/users`);
		groupsSignal.set([makeGroup('g1', policy1, [USER_ID]), makeGroup('g2', policy2, [USER_ID])]);

		mockIsAuthorized.mockReturnValue({
			type: 'success',
			response: { decision: 'allow', diagnostics: { reason: [], errors: [] } },
			warnings: [],
		});

		service.canI('connection:read', 'Connection', CONN_ID)();

		const call = mockIsAuthorized.mock.calls[0][0];
		expect(call.policies.staticPolicies).toContain('connection:read');
		expect(call.policies.staticPolicies).toContain('table:read');
	});

	it('ignores groups the user does not belong to', async () => {
		wasmLoaded();
		await TestBed.inject(CedarWasmService).load();
		userSubject.next({ id: USER_ID } as User);

		const userPolicy = permitPolicy('connection:read', 'Connection', CONN_ID);
		const otherPolicy = permitPolicy('connection:edit', 'Connection', CONN_ID);
		groupsSignal.set([makeGroup('g1', userPolicy, [USER_ID]), makeGroup('g2', otherPolicy, ['other-user'])]);

		mockIsAuthorized.mockReturnValue({
			type: 'success',
			response: { decision: 'allow', diagnostics: { reason: [], errors: [] } },
			warnings: [],
		});

		service.canI('connection:read', 'Connection', CONN_ID)();

		const call = mockIsAuthorized.mock.calls[0][0];
		expect(call.policies.staticPolicies).toContain('connection:read');
		expect(call.policies.staticPolicies).not.toContain('connection:edit');
	});

	it('signal auto-refreshes when groups change', async () => {
		wasmLoaded();
		await TestBed.inject(CedarWasmService).load();
		userSubject.next({ id: USER_ID } as User);

		// Initially no groups → null (not yet determined)
		const sig = service.canI('connection:read', 'Connection', CONN_ID);
		expect(sig()).toBe(null);

		// Add a group with a permit policy
		groupsSignal.set([makeGroup('g1', permitPolicy('connection:read', 'Connection', CONN_ID), [USER_ID])]);

		mockIsAuthorized.mockReturnValue({
			type: 'success',
			response: { decision: 'allow', diagnostics: { reason: [], errors: [] } },
			warnings: [],
		});

		// Same signal should now return true
		expect(sig()).toBe(true);
	});

	it('same args return same signal instance', () => {
		const sig1 = service.canI('connection:read', 'Connection', CONN_ID);
		const sig2 = service.canI('connection:read', 'Connection', CONN_ID);
		expect(sig1).toBe(sig2);
	});

	it('different args return different signal instances', () => {
		const sig1 = service.canI('connection:read', 'Connection', CONN_ID);
		const sig2 = service.canI('connection:edit', 'Connection', CONN_ID);
		expect(sig1).not.toBe(sig2);
	});

	it('ready signal reflects state correctly', async () => {
		expect(service.ready()).toBe(false);

		wasmLoaded();
		await TestBed.inject(CedarWasmService).load();
		expect(service.ready()).toBe(false); // no user yet

		userSubject.next({ id: USER_ID } as User);
		expect(service.ready()).toBe(false); // no groups yet

		groupsSignal.set([makeGroup('g1', permitPolicy('connection:read', 'Connection', CONN_ID), [USER_ID])]);
		expect(service.ready()).toBe(true);
	});

	it('returns false on isAuthorized failure', async () => {
		wasmLoaded();
		await TestBed.inject(CedarWasmService).load();
		userSubject.next({ id: USER_ID } as User);
		groupsSignal.set([makeGroup('g1', permitPolicy('connection:read', 'Connection', CONN_ID), [USER_ID])]);

		mockIsAuthorized.mockReturnValue({
			type: 'failure',
			errors: [{ message: 'some error' }],
			warnings: [],
		});

		const sig = service.canI('connection:read', 'Connection', CONN_ID);
		expect(sig()).toBe(false);
	});

	// canIAny tests (partial authorization)

	it('canIAny returns null when WASM not loaded', () => {
		userSubject.next({ id: USER_ID } as User);
		groupsSignal.set([makeGroup('g1', permitPolicy('dashboard:read', 'Dashboard', `${CONN_ID}/dash-1`), [USER_ID])]);

		const sig = service.canIAny('dashboard:read', 'Dashboard');
		expect(sig()).toBe(null);
	});

	it('canIAny returns null when no user', async () => {
		wasmLoaded();
		await TestBed.inject(CedarWasmService).load();
		groupsSignal.set([makeGroup('g1', permitPolicy('dashboard:read', 'Dashboard', `${CONN_ID}/dash-1`), [USER_ID])]);

		const sig = service.canIAny('dashboard:read', 'Dashboard');
		expect(sig()).toBe(null);
		expect(mockIsAuthorizedPartial).not.toHaveBeenCalled();
	});

	it('canIAny returns true when decision is allow (wildcard policy)', async () => {
		wasmLoaded();
		await TestBed.inject(CedarWasmService).load();
		userSubject.next({ id: USER_ID } as User);
		groupsSignal.set([makeGroup('g1', 'permit(principal, action, resource);', [USER_ID])]);

		mockIsAuthorizedPartial.mockReturnValue({
			type: 'residuals',
			response: { decision: 'allow', satisfied: ['policy0'], errored: [], mayBeDetermining: [], mustBeDetermining: [] },
			warnings: [],
		});

		const sig = service.canIAny('dashboard:read', 'Dashboard');
		expect(sig()).toBe(true);
	});

	it('canIAny returns true when decision is null (resource-dependent)', async () => {
		wasmLoaded();
		await TestBed.inject(CedarWasmService).load();
		userSubject.next({ id: USER_ID } as User);
		groupsSignal.set([makeGroup('g1', permitPolicy('dashboard:read', 'Dashboard', `${CONN_ID}/dash-1`), [USER_ID])]);

		mockIsAuthorizedPartial.mockReturnValue({
			type: 'residuals',
			response: { decision: null, satisfied: [], errored: [], mayBeDetermining: ['policy0'], mustBeDetermining: [] },
			warnings: [],
		});

		const sig = service.canIAny('dashboard:read', 'Dashboard');
		expect(sig()).toBe(true);
	});

	it('canIAny returns false when decision is deny', async () => {
		wasmLoaded();
		await TestBed.inject(CedarWasmService).load();
		userSubject.next({ id: USER_ID } as User);
		groupsSignal.set([makeGroup('g1', permitPolicy('connection:read', 'Connection', CONN_ID), [USER_ID])]);

		mockIsAuthorizedPartial.mockReturnValue({
			type: 'residuals',
			response: { decision: 'deny', satisfied: [], errored: [], mayBeDetermining: [], mustBeDetermining: [] },
			warnings: [],
		});

		const sig = service.canIAny('dashboard:read', 'Dashboard');
		expect(sig()).toBe(false);
	});

	it('canIAny returns false on partial authorization failure', async () => {
		wasmLoaded();
		await TestBed.inject(CedarWasmService).load();
		userSubject.next({ id: USER_ID } as User);
		groupsSignal.set([makeGroup('g1', permitPolicy('dashboard:read', 'Dashboard', `${CONN_ID}/dash-1`), [USER_ID])]);

		mockIsAuthorizedPartial.mockReturnValue({
			type: 'failure',
			errors: [{ message: 'parse error' }],
			warnings: [],
		});

		const sig = service.canIAny('dashboard:read', 'Dashboard');
		expect(sig()).toBe(false);
	});

	it('canIAny calls isAuthorizedPartial with resource null', async () => {
		wasmLoaded();
		await TestBed.inject(CedarWasmService).load();
		userSubject.next({ id: USER_ID } as User);
		groupsSignal.set([makeGroup('g1', permitPolicy('group:read', 'Group', 'g1'), [USER_ID])]);

		mockIsAuthorizedPartial.mockReturnValue({
			type: 'residuals',
			response: { decision: null, satisfied: [], errored: [], mayBeDetermining: [], mustBeDetermining: [] },
			warnings: [],
		});

		service.canIAny('group:read', 'Group')();

		expect(mockIsAuthorizedPartial).toHaveBeenCalledWith(
			expect.objectContaining({
				principal: { type: 'RocketAdmin::User', id: USER_ID },
				action: { type: 'RocketAdmin::Action', id: 'group:read' },
				resource: null,
			}),
		);
	});

	it('canIAny caches signals by action and resourceType', () => {
		const sig1 = service.canIAny('dashboard:read', 'Dashboard');
		const sig2 = service.canIAny('dashboard:read', 'Dashboard');
		const sig3 = service.canIAny('group:read', 'Group');
		expect(sig1).toBe(sig2);
		expect(sig1).not.toBe(sig3);
	});
});
