import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { type ComputedRef, type Ref, ref, shallowRef } from 'vue';
import { api } from '@/api/client';
import { loadCedarWasm } from '@/lib/cedar-wasm';
import { CompanyMemberRole } from '@/models/company';
import { SubscriptionPlans, type UserGroupInfo } from '@/models/user';
import { useUserStore } from '@/stores/user';
import { useUsersStore } from '@/stores/users';
import { type CedarEngine, createPermissionEvaluator, useCedarPermissionsStore } from './cedar-permissions';

vi.mock('@/lib/cedar-wasm', () => ({ loadCedarWasm: vi.fn() }));
vi.mock('@/api/client', () => ({ api: { get: vi.fn() } }));
vi.mock('@/router', () => ({
	router: {
		afterEach: vi.fn(() => () => {}),
		currentRoute: { value: { query: {}, fullPath: '/', path: '/', hash: '' } },
	},
}));

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
				role: CompanyMemberRole.Member,
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

const ALLOW = {
	type: 'success',
	response: { decision: 'allow', diagnostics: { reason: [], errors: [] } },
	warnings: [],
};
const DENY = { type: 'success', response: { decision: 'deny', diagnostics: { reason: [], errors: [] } }, warnings: [] };

function residuals(decision: 'allow' | 'deny' | null) {
	return {
		type: 'residuals',
		response: { decision, satisfied: [], errored: [], mayBeDetermining: [], mustBeDetermining: [] },
		warnings: [],
	};
}

interface EngineMocks {
	isAuthorized: Mock;
	isAuthorizedPartial: Mock;
	checkParsePolicySet: Mock;
}

/** Reads a permission so its computed runs. */
function evaluate(permission: ComputedRef<boolean | null>): boolean | null {
	return permission.value;
}

function staticPolicies(mock: Mock): string {
	return (mock.mock.calls.at(-1)?.[0] as { policies: { staticPolicies: string } }).policies.staticPolicies;
}

describe('createPermissionEvaluator', () => {
	let mocks: EngineMocks;
	let engine: Ref<CedarEngine | null>;
	let userId: Ref<string | null>;
	let groups: Ref<UserGroupInfo[]>;
	let viewAsGroupId: Ref<string | null>;
	let evaluator: ReturnType<typeof createPermissionEvaluator>;

	function loadEngine() {
		engine.value = mocks as unknown as CedarEngine;
	}

	beforeEach(() => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		mocks = {
			isAuthorized: vi.fn().mockReturnValue(DENY),
			isAuthorizedPartial: vi.fn().mockReturnValue(residuals('deny')),
			// Every policy parses unless a test says otherwise.
			checkParsePolicySet: vi.fn().mockReturnValue({ type: 'success' }),
		};
		engine = shallowRef(null);
		userId = ref(null);
		groups = ref([]);
		viewAsGroupId = ref(null);
		evaluator = createPermissionEvaluator({ engine, userId, groups, viewAsGroupId });
	});

	describe('canI', () => {
		it('is null while the engine loads', () => {
			userId.value = USER_ID;
			groups.value = [makeGroup('g1', permitPolicy('connection:read', 'Connection', CONN_ID), [USER_ID])];
			expect(evaluator.canI('connection:read', 'Connection', CONN_ID).value).toBeNull();
		});

		it('is null without a user', () => {
			loadEngine();
			groups.value = [makeGroup('g1', permitPolicy('connection:read', 'Connection', CONN_ID), [USER_ID])];

			expect(evaluator.canI('connection:read', 'Connection', CONN_ID).value).toBeNull();
			expect(mocks.isAuthorized).not.toHaveBeenCalled();
		});

		it('is null when the user has no groups', () => {
			loadEngine();
			userId.value = USER_ID;

			expect(evaluator.canI('connection:read', 'Connection', CONN_ID).value).toBeNull();
			expect(mocks.isAuthorized).not.toHaveBeenCalled();
		});

		it('is true when the policy permits the action', () => {
			loadEngine();
			userId.value = USER_ID;
			groups.value = [makeGroup('g1', permitPolicy('connection:read', 'Connection', CONN_ID), [USER_ID])];
			mocks.isAuthorized.mockReturnValue(ALLOW);

			expect(evaluator.canI('connection:read', 'Connection', CONN_ID).value).toBe(true);
			expect(mocks.isAuthorized).toHaveBeenCalledWith(
				expect.objectContaining({
					principal: { type: 'RocketAdmin::User', id: USER_ID },
					action: { type: 'RocketAdmin::Action', id: 'connection:read' },
					resource: { type: 'RocketAdmin::Connection', id: CONN_ID },
				}),
			);
		});

		it('is false when the policy denies the action', () => {
			loadEngine();
			userId.value = USER_ID;
			groups.value = [makeGroup('g1', permitPolicy('connection:read', 'Connection', CONN_ID), [USER_ID])];

			expect(evaluator.canI('connection:edit', 'Connection', CONN_ID).value).toBe(false);
		});

		it('is false when authorization fails or throws', () => {
			loadEngine();
			userId.value = USER_ID;
			groups.value = [makeGroup('g1', permitPolicy('connection:read', 'Connection', CONN_ID), [USER_ID])];
			mocks.isAuthorized.mockReturnValueOnce({ type: 'failure', errors: [{ message: 'some error' }], warnings: [] });

			expect(evaluator.canI('connection:read', 'Connection', CONN_ID).value).toBe(false);

			mocks.isAuthorized.mockImplementationOnce(() => {
				throw new Error('wasm trap');
			});
			expect(evaluator.canI('connection:read', 'Connection', 'other').value).toBe(false);
		});

		it('is false without a resource id once the engine is ready', () => {
			userId.value = USER_ID;
			groups.value = [makeGroup('g1', permitPolicy('connection:read', 'Connection', CONN_ID), [USER_ID])];
			const permission = evaluator.canI('connection:edit', 'Connection', null);
			expect(permission.value).toBeNull();

			loadEngine();
			expect(permission.value).toBe(false);
			expect(mocks.isAuthorized).not.toHaveBeenCalled();
		});

		it('merges the policies of every group the user is in', () => {
			loadEngine();
			userId.value = USER_ID;
			groups.value = [
				makeGroup('g1', permitPolicy('connection:read', 'Connection', CONN_ID), [USER_ID]),
				makeGroup('g2', permitPolicy('table:read', 'Table', `${CONN_ID}/users`), [USER_ID]),
			];

			evaluate(evaluator.canI('connection:read', 'Connection', CONN_ID));

			expect(staticPolicies(mocks.isAuthorized)).toContain('connection:read');
			expect(staticPolicies(mocks.isAuthorized)).toContain('table:read');
		});

		it('ignores groups the user is not in', () => {
			loadEngine();
			userId.value = USER_ID;
			groups.value = [
				makeGroup('g1', permitPolicy('connection:read', 'Connection', CONN_ID), [USER_ID]),
				makeGroup('g2', permitPolicy('connection:edit', 'Connection', CONN_ID), ['other-user']),
			];

			evaluate(evaluator.canI('connection:read', 'Connection', CONN_ID));

			expect(staticPolicies(mocks.isAuthorized)).not.toContain('connection:edit');
		});

		it('recomputes when the groups change', () => {
			loadEngine();
			userId.value = USER_ID;
			const permission = evaluator.canI('connection:read', 'Connection', CONN_ID);
			expect(permission.value).toBeNull();

			mocks.isAuthorized.mockReturnValue(ALLOW);
			groups.value = [makeGroup('g1', permitPolicy('connection:read', 'Connection', CONN_ID), [USER_ID])];

			expect(permission.value).toBe(true);
		});

		it('returns the same ref for the same arguments', () => {
			expect(evaluator.canI('connection:read', 'Connection', CONN_ID)).toBe(
				evaluator.canI('connection:read', 'Connection', CONN_ID),
			);
			expect(evaluator.canI('connection:read', 'Connection', CONN_ID)).not.toBe(
				evaluator.canI('connection:edit', 'Connection', CONN_ID),
			);
		});
	});

	it('is ready once the engine, a user and a policy are all there', () => {
		expect(evaluator.ready.value).toBe(false);
		loadEngine();
		expect(evaluator.ready.value).toBe(false);
		userId.value = USER_ID;
		expect(evaluator.ready.value).toBe(false);
		groups.value = [makeGroup('g1', permitPolicy('connection:read', 'Connection', CONN_ID), [USER_ID])];
		expect(evaluator.ready.value).toBe(true);
	});

	describe('canIAny', () => {
		beforeEach(() => {
			userId.value = USER_ID;
			groups.value = [makeGroup('g1', permitPolicy('dashboard:read', 'Dashboard', `${CONN_ID}/dash-1`), [USER_ID])];
		});

		it('is null while the engine loads', () => {
			expect(evaluator.canIAny('dashboard:read', 'Dashboard').value).toBeNull();
		});

		it('is null without a user', () => {
			loadEngine();
			userId.value = null;
			expect(evaluator.canIAny('dashboard:read', 'Dashboard').value).toBeNull();
			expect(mocks.isAuthorizedPartial).not.toHaveBeenCalled();
		});

		it.each([
			['allow (wildcard policy)', 'allow' as const, true],
			['null (depends on the resource)', null, true],
			['deny', 'deny' as const, false],
		])('maps a %s decision', (_label, decision, expected) => {
			loadEngine();
			mocks.isAuthorizedPartial.mockReturnValue(residuals(decision));
			expect(evaluator.canIAny('dashboard:read', 'Dashboard').value).toBe(expected);
		});

		it('is false when partial authorization fails', () => {
			loadEngine();
			mocks.isAuthorizedPartial.mockReturnValue({
				type: 'failure',
				errors: [{ message: 'parse error' }],
				warnings: [],
			});
			expect(evaluator.canIAny('dashboard:read', 'Dashboard').value).toBe(false);
		});

		it('leaves the resource open', () => {
			loadEngine();
			mocks.isAuthorizedPartial.mockReturnValue(residuals(null));

			evaluate(evaluator.canIAny('group:read', 'Group'));

			expect(mocks.isAuthorizedPartial).toHaveBeenCalledWith(
				expect.objectContaining({
					principal: { type: 'RocketAdmin::User', id: USER_ID },
					action: { type: 'RocketAdmin::Action', id: 'group:read' },
					resource: null,
				}),
			);
		});

		it('caches by action and resource type', () => {
			expect(evaluator.canIAny('dashboard:read', 'Dashboard')).toBe(evaluator.canIAny('dashboard:read', 'Dashboard'));
			expect(evaluator.canIAny('dashboard:read', 'Dashboard')).not.toBe(evaluator.canIAny('group:read', 'Group'));
		});
	});

	describe('view-as', () => {
		beforeEach(() => {
			loadEngine();
			userId.value = USER_ID;
			mocks.isAuthorized.mockReturnValue(ALLOW);
			groups.value = [
				makeGroup('own', permitPolicy('connection:edit', 'Connection', CONN_ID), [USER_ID]),
				makeGroup('target', permitPolicy('connection:read', 'Connection', CONN_ID), ['other-user']),
			];
		});

		it("evaluates the target group's policy only", () => {
			viewAsGroupId.value = 'target';

			evaluate(evaluator.canI('connection:read', 'Connection', CONN_ID));

			expect(staticPolicies(mocks.isAuthorized)).toContain('connection:read');
			expect(staticPolicies(mocks.isAuthorized)).not.toContain('connection:edit');
		});

		it("flips back to the user's own groups when cleared", () => {
			const permission = evaluator.canI('connection:read', 'Connection', CONN_ID);

			viewAsGroupId.value = 'target';
			evaluate(permission);
			expect(staticPolicies(mocks.isAuthorized)).not.toContain('connection:edit');

			viewAsGroupId.value = null;
			evaluate(permission);
			expect(staticPolicies(mocks.isAuthorized)).toContain('connection:edit');
		});

		it('is null when the target group has no policy', () => {
			groups.value = [makeGroup('target', null, ['other-user'])];
			viewAsGroupId.value = 'target';

			expect(evaluator.canI('connection:read', 'Connection', CONN_ID).value).toBeNull();
			expect(mocks.isAuthorized).not.toHaveBeenCalled();
		});

		it('is null when the target group does not exist', () => {
			viewAsGroupId.value = 'does-not-exist';

			expect(evaluator.canI('connection:read', 'Connection', CONN_ID).value).toBeNull();
			expect(mocks.isAuthorized).not.toHaveBeenCalled();
		});
	});

	describe('resilient merge', () => {
		beforeEach(() => {
			loadEngine();
			userId.value = USER_ID;
		});

		it('drops an unparseable policy and keeps the valid ones', () => {
			mocks.checkParsePolicySet
				.mockReturnValueOnce({ type: 'success' })
				.mockReturnValueOnce({ type: 'failure', errors: [{ message: 'unexpected token like' }] });
			mocks.isAuthorized.mockReturnValue(ALLOW);
			groups.value = [
				makeGroup('g1', permitPolicy('connection:read', 'Connection', CONN_ID), [USER_ID]),
				makeGroup('g2', 'permit(principal, action like RocketAdmin::Action::"x:*", resource);', [USER_ID]),
			];

			evaluate(evaluator.canI('connection:read', 'Connection', CONN_ID));

			expect(staticPolicies(mocks.isAuthorized)).toContain('connection:read');
			expect(staticPolicies(mocks.isAuthorized)).not.toContain('action like');
		});

		it("does not let one group's bad policy block canIAny", () => {
			mocks.checkParsePolicySet.mockImplementation((arg: { staticPolicies: string }) =>
				arg.staticPolicies.includes('action like')
					? { type: 'failure', errors: [{ message: 'unexpected token like' }] }
					: { type: 'success' },
			);
			mocks.isAuthorizedPartial.mockReturnValue(residuals('allow'));
			groups.value = [
				makeGroup('admin', 'permit(principal, action, resource);', [USER_ID]),
				makeGroup('bad', 'permit(principal, action like RocketAdmin::Action::"dashboard:*", resource);', [USER_ID]),
			];

			expect(evaluator.canIAny('group:read', 'Group').value).toBe(true);
			expect(staticPolicies(mocks.isAuthorizedPartial)).toContain('permit(principal, action, resource)');
			expect(staticPolicies(mocks.isAuthorizedPartial)).not.toContain('action like');
		});

		it('is null when every policy is unparseable', () => {
			mocks.checkParsePolicySet.mockReturnValue({ type: 'failure', errors: [{ message: 'parse error' }] });
			groups.value = [
				makeGroup('g1', 'permit(principal, action like X, resource);', [USER_ID]),
				makeGroup('g2', 'permit(principal, action like Y, resource);', [USER_ID]),
			];

			expect(evaluator.canI('connection:read', 'Connection', CONN_ID).value).toBeNull();
			expect(mocks.isAuthorized).not.toHaveBeenCalled();
		});
	});
});

describe('useCedarPermissionsStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('evaluates the signed-in user against the groups of the active connection', async () => {
		const engine = {
			isAuthorized: vi.fn().mockReturnValue(ALLOW),
			isAuthorizedPartial: vi.fn().mockReturnValue(residuals(null)),
			checkParsePolicySet: vi.fn().mockReturnValue({ type: 'success' }),
		};
		vi.mocked(loadCedarWasm).mockResolvedValue(engine as unknown as Awaited<ReturnType<typeof loadCedarWasm>>);
		vi.mocked(api.get).mockImplementation(async (url: string) =>
			url === `/connection/groups/${CONN_ID}`
				? ([makeGroup('g1', permitPolicy('connection:edit', 'Connection', CONN_ID), [USER_ID])] as never)
				: (null as never),
		);

		const store = useCedarPermissionsStore();
		const canEdit = store.canI('connection:edit', 'Connection', CONN_ID);
		expect(canEdit.value).toBeNull();

		useUserStore().currentUser = {
			id: USER_ID,
			isActive: true,
			email: 'user-1@test.com',
			subscriptionLevel: SubscriptionPlans.free,
			is_2fa_enabled: false,
			role: CompanyMemberRole.Member,
			externalRegistrationProvider: null,
			company: { id: 'company-1' },
		};
		useUsersStore().setActiveConnection(CONN_ID);
		await flushPromises();

		expect(store.ready).toBe(true);
		expect(canEdit.value).toBe(true);
		expect(store.canIAny('dashboard:read', 'Dashboard').value).toBe(true);
	});

	it('stays undetermined when the wasm fails to load', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(loadCedarWasm).mockRejectedValue(new Error('no wasm'));

		const store = useCedarPermissionsStore();
		await flushPromises();

		expect(store.ready).toBe(false);
		expect(store.canIAny('dashboard:read', 'Dashboard').value).toBeNull();
	});
});
