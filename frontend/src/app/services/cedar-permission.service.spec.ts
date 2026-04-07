import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { User, UserGroupInfo } from '../models/user';
import { CedarPermissionService } from './cedar-permission.service';
import { CedarWasmService } from './cedar-wasm.service';
import { UserService } from './user.service';
import { UsersService } from './users.service';
import { ViewAsService } from './view-as.service';

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
	let viewAsSignal: WritableSignal<string | null>;
	let userSubject: BehaviorSubject<User | null>;
	let mockIsAuthorized: ReturnType<typeof vi.fn>;
	let mockIsAuthorizedPartial: ReturnType<typeof vi.fn>;
	let mockCheckParsePolicySet: ReturnType<typeof vi.fn>;
	let wasmLoaded: () => void;

	beforeEach(() => {
		groupsSignal = signal<UserGroupInfo[]>([]);
		viewAsSignal = signal<string | null>(null);
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

		// Default: every policy parses successfully. Individual tests can override
		// to simulate malformed policies that the merge step should drop.
		mockCheckParsePolicySet = vi.fn().mockReturnValue({ type: 'success' });

		let resolveWasm: (mod: unknown) => void;
		const wasmPromise = new Promise<unknown>((resolve) => {
			resolveWasm = resolve;
		});
		wasmLoaded = () =>
			resolveWasm!({
				isAuthorized: mockIsAuthorized,
				isAuthorizedPartial: mockIsAuthorizedPartial,
				checkParsePolicySet: mockCheckParsePolicySet,
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
				{
					provide: ViewAsService,
					useValue: { viewAsGroupId: viewAsSignal.asReadonly() },
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

	// View-as group override

	it('view-as: evaluates against the target group policy only, ignoring the user own groups', async () => {
		wasmLoaded();
		await TestBed.inject(CedarWasmService).load();
		userSubject.next({ id: USER_ID } as User);

		const ownPolicy = permitPolicy('connection:edit', 'Connection', CONN_ID);
		const targetPolicy = permitPolicy('connection:read', 'Connection', CONN_ID);
		groupsSignal.set([makeGroup('own', ownPolicy, [USER_ID]), makeGroup('target', targetPolicy, ['other-user'])]);

		viewAsSignal.set('target');

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

	it('view-as: signal flips back to user own groups when cleared', async () => {
		wasmLoaded();
		await TestBed.inject(CedarWasmService).load();
		userSubject.next({ id: USER_ID } as User);

		const ownPolicy = permitPolicy('connection:edit', 'Connection', CONN_ID);
		const targetPolicy = permitPolicy('connection:read', 'Connection', CONN_ID);
		groupsSignal.set([makeGroup('own', ownPolicy, [USER_ID]), makeGroup('target', targetPolicy, ['other-user'])]);

		mockIsAuthorized.mockReturnValue({
			type: 'success',
			response: { decision: 'allow', diagnostics: { reason: [], errors: [] } },
			warnings: [],
		});

		const sig = service.canI('connection:read', 'Connection', CONN_ID);

		viewAsSignal.set('target');
		sig();
		expect(mockIsAuthorized.mock.calls.at(-1)![0].policies.staticPolicies).toContain('connection:read');
		expect(mockIsAuthorized.mock.calls.at(-1)![0].policies.staticPolicies).not.toContain('connection:edit');

		viewAsSignal.set(null);
		sig();
		expect(mockIsAuthorized.mock.calls.at(-1)![0].policies.staticPolicies).toContain('connection:edit');
	});

	it('view-as: returns null when target group has no policy (engine not ready)', async () => {
		wasmLoaded();
		await TestBed.inject(CedarWasmService).load();
		userSubject.next({ id: USER_ID } as User);

		groupsSignal.set([makeGroup('target', null, ['other-user'])]);
		viewAsSignal.set('target');

		const sig = service.canI('connection:read', 'Connection', CONN_ID);
		expect(sig()).toBe(null);
		expect(mockIsAuthorized).not.toHaveBeenCalled();
	});

	it('view-as: returns null when target group does not exist in groups list', async () => {
		wasmLoaded();
		await TestBed.inject(CedarWasmService).load();
		userSubject.next({ id: USER_ID } as User);

		groupsSignal.set([makeGroup('own', permitPolicy('connection:read', 'Connection', CONN_ID), [USER_ID])]);
		viewAsSignal.set('does-not-exist');

		const sig = service.canI('connection:read', 'Connection', CONN_ID);
		expect(sig()).toBe(null);
		expect(mockIsAuthorized).not.toHaveBeenCalled();
	});

	// Resilient merge: drop individually unparseable policies

	it('resilient merge: drops a single unparseable policy and keeps the valid ones', async () => {
		wasmLoaded();
		await TestBed.inject(CedarWasmService).load();
		userSubject.next({ id: USER_ID } as User);

		const goodPolicy = permitPolicy('connection:read', 'Connection', CONN_ID);
		const badPolicy = 'permit(principal, action like RocketAdmin::Action::"x:*", resource);';

		// First policy parses, second does not
		mockCheckParsePolicySet
			.mockReturnValueOnce({ type: 'success' })
			.mockReturnValueOnce({ type: 'failure', errors: [{ message: 'unexpected token like' }] });

		groupsSignal.set([makeGroup('g1', goodPolicy, [USER_ID]), makeGroup('g2', badPolicy, [USER_ID])]);

		mockIsAuthorized.mockReturnValue({
			type: 'success',
			response: { decision: 'allow', diagnostics: { reason: [], errors: [] } },
			warnings: [],
		});

		service.canI('connection:read', 'Connection', CONN_ID)();

		const call = mockIsAuthorized.mock.calls.at(-1)![0];
		expect(call.policies.staticPolicies).toContain('connection:read');
		expect(call.policies.staticPolicies).not.toContain('action like');
	});

	it('resilient merge: a bad policy in one group does not block canIAny on others', async () => {
		wasmLoaded();
		await TestBed.inject(CedarWasmService).load();
		userSubject.next({ id: USER_ID } as User);

		// Wildcard policy from Admin group, plus an unparseable policy from another group
		const adminPolicy = 'permit(principal, action, resource);';
		const badPolicy = 'permit(principal, action like RocketAdmin::Action::"dashboard:*", resource);';

		mockCheckParsePolicySet.mockImplementation((arg: { staticPolicies: string }) => {
			if (arg.staticPolicies.includes('action like')) {
				return { type: 'failure', errors: [{ message: 'unexpected token like' }] };
			}
			return { type: 'success' };
		});

		groupsSignal.set([makeGroup('admin', adminPolicy, [USER_ID]), makeGroup('bad', badPolicy, [USER_ID])]);

		mockIsAuthorizedPartial.mockReturnValue({
			type: 'residuals',
			response: { decision: 'allow', satisfied: ['policy0'], errored: [], mayBeDetermining: [], mustBeDetermining: [] },
			warnings: [],
		});

		const sig = service.canIAny('group:read', 'Group');
		expect(sig()).toBe(true);

		const call = mockIsAuthorizedPartial.mock.calls.at(-1)![0];
		expect(call.policies.staticPolicies).toContain('permit(principal, action, resource)');
		expect(call.policies.staticPolicies).not.toContain('action like');
	});

	it('resilient merge: returns empty when all policies are unparseable', async () => {
		wasmLoaded();
		await TestBed.inject(CedarWasmService).load();
		userSubject.next({ id: USER_ID } as User);

		mockCheckParsePolicySet.mockReturnValue({ type: 'failure', errors: [{ message: 'parse error' }] });

		groupsSignal.set([
			makeGroup('g1', 'permit(principal, action like X, resource);', [USER_ID]),
			makeGroup('g2', 'permit(principal, action like Y, resource);', [USER_ID]),
		]);

		const sig = service.canI('connection:read', 'Connection', CONN_ID);
		expect(sig()).toBe(null);
		expect(mockIsAuthorized).not.toHaveBeenCalled();
	});
});
