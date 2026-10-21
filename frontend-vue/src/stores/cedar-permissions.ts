// Port of frontend/src/app/services/cedar-permission.service.ts: client-side Cedar authorization.
// The signed-in user's group policies (or, in view-as mode, the target group's policy alone) are
// merged and evaluated in the Cedar wasm engine, so the UI can hide what the backend would refuse.
//
// The evaluation lives in createPermissionEvaluator() over plain refs so it is testable without the
// stores it reads; the store only wires it to user, users and view-as.
import { defineStore } from 'pinia';
import { type ComputedRef, computed, type Ref, shallowRef } from 'vue';
import { loadCedarWasm } from '@/lib/cedar-wasm';
import type { UserGroupInfo } from '@/models/user';
import { useUserStore } from '@/stores/user';
import { useUsersStore } from '@/stores/users';
import { useViewAsStore } from '@/stores/view-as';

export type CedarWasmModule = Awaited<ReturnType<typeof loadCedarWasm>>;

/** The slice of the wasm module the evaluator calls; a test can hand in a stub. */
export type CedarEngine = Pick<CedarWasmModule, 'isAuthorized' | 'isAuthorizedPartial' | 'checkParsePolicySet'>;

export interface PermissionInputs {
	engine: Readonly<Ref<CedarEngine | null>>;
	userId: Readonly<Ref<string | null>>;
	groups: Readonly<Ref<UserGroupInfo[]>>;
	viewAsGroupId: Readonly<Ref<string | null>>;
}

export interface PermissionEvaluator {
	/** True once the engine, a user and at least one applicable policy are all present. */
	ready: ComputedRef<boolean>;
	/** null while undetermined (engine loading, no user, no policies), then allow/deny. */
	canI(action: string, resourceType: string, resourceId: string | null): ComputedRef<boolean | null>;
	/** Whether the action is allowed on at least one resource of the type (partial evaluation). */
	canIAny(action: string, resourceType: string): ComputedRef<boolean | null>;
}

export function createPermissionEvaluator({
	engine,
	userId,
	groups,
	viewAsGroupId,
}: PermissionInputs): PermissionEvaluator {
	const mergedPolicies = computed(() => {
		const cedar = engine.value;
		const candidates: string[] = [];

		if (viewAsGroupId.value) {
			// View-as: the target group's policy only, whatever groups the user is really in.
			const target = groups.value.find((info) => info.group.id === viewAsGroupId.value);
			const policy = target?.group.cedarPolicy?.trim();
			if (policy) candidates.push(policy);
		} else {
			const id = userId.value;
			if (!id || !groups.value.length) return '';
			for (const info of groups.value) {
				if (!info.group.users?.some((user) => user.id === id)) continue;
				const policy = info.group.cedarPolicy;
				if (policy && policy.trim().length > 0) candidates.push(policy);
			}
		}

		if (candidates.length === 0) return '';

		// Drop individually unparseable policies: one malformed group policy would otherwise make Cedar
		// reject the whole request and deny the user everything. Before the engine loads, the raw merge
		// is returned; evaluation waits for the engine anyway.
		if (!cedar) return candidates.join('\n\n');

		const valid = candidates.filter((policy) => {
			const result = cedar.checkParsePolicySet({ staticPolicies: policy, templates: {} });
			if (result.type === 'success') return true;
			console.warn('Cedar: dropping unparseable group policy', result.errors);
			return false;
		});
		return valid.join('\n\n');
	});

	const ready = computed(() => !!engine.value && !!mergedPolicies.value && !!userId.value);
	const cache = new Map<string, ComputedRef<boolean | null>>();

	function evaluate(action: string, resourceType: string, resourceId: string | null): boolean | null {
		const cedar = engine.value;
		const policies = mergedPolicies.value;
		const principalId = userId.value;
		if (!cedar || !policies || !principalId) return null;
		// No resource (e.g. no connection selected yet) can never be authorized.
		if (resourceId === null) return false;

		try {
			const result = cedar.isAuthorized({
				principal: { type: 'RocketAdmin::User', id: principalId },
				action: { type: 'RocketAdmin::Action', id: action },
				resource: { type: `RocketAdmin::${resourceType}`, id: resourceId },
				context: {},
				policies: { staticPolicies: policies, templates: {}, templateLinks: [] },
				entities: [],
			});
			if (result.type === 'success') return result.response.decision === 'allow';
			console.warn('Cedar authorization failed:', result.errors);
		} catch (error) {
			console.warn('Cedar authorization failed:', error);
		}
		return false;
	}

	function evaluatePartial(action: string): boolean | null {
		const cedar = engine.value;
		const policies = mergedPolicies.value;
		const principalId = userId.value;
		if (!cedar || !policies || !principalId) return null;

		try {
			const result = cedar.isAuthorizedPartial({
				principal: { type: 'RocketAdmin::User', id: principalId },
				action: { type: 'RocketAdmin::Action', id: action },
				resource: null,
				context: {},
				policies: { staticPolicies: policies, templates: {}, templateLinks: [] },
				entities: [],
			});
			// 'allow' (unconditionally), 'deny' (unconditionally) or null: depends on the resource,
			// so at least one resource could be allowed.
			if (result.type === 'residuals') return result.response.decision !== 'deny';
			console.warn('Cedar partial authorization failed:', result.errors);
		} catch (error) {
			console.warn('Cedar partial authorization failed:', error);
		}
		return false;
	}

	function cached(key: string, compute: () => boolean | null): ComputedRef<boolean | null> {
		let entry = cache.get(key);
		if (!entry) {
			entry = computed(compute);
			cache.set(key, entry);
		}
		return entry;
	}

	return {
		ready,
		canI: (action, resourceType, resourceId) =>
			cached(`${action}|${resourceType}|${resourceId}`, () => evaluate(action, resourceType, resourceId)),
		// resourceType only keys the cache: partial evaluation leaves the resource open.
		canIAny: (action, resourceType) => cached(`any|${action}|${resourceType}`, () => evaluatePartial(action)),
	};
}

export const useCedarPermissionsStore = defineStore('cedarPermissions', () => {
	const user = useUserStore();
	const users = useUsersStore();
	const viewAs = useViewAsStore();

	const engine = shallowRef<CedarEngine | null>(null);
	loadCedarWasm()
		.then((module) => {
			engine.value = module;
		})
		.catch((error) => console.error('Cedar wasm failed to load', error));

	const evaluator = createPermissionEvaluator({
		engine,
		userId: computed(() => user.currentUser?.id || null),
		groups: computed(() => users.groups),
		viewAsGroupId: computed(() => viewAs.viewAsGroupId),
	});

	return {
		ready: evaluator.ready,
		canI: evaluator.canI,
		canIAny: evaluator.canIAny,
	};
});
