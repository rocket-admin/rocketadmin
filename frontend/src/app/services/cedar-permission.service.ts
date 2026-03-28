import { computed, Injectable, inject, Signal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { User } from '../models/user';
import { CedarWasmService } from './cedar-wasm.service';
import { UserService } from './user.service';
import { UsersService } from './users.service';

type CedarWasmModule = typeof import('@cedar-policy/cedar-wasm/web');

@Injectable({ providedIn: 'root' })
export class CedarPermissionService {
	private _cedarWasm = inject(CedarWasmService);
	private _userService = inject(UserService);
	private _usersService = inject(UsersService);

	private _currentUser = toSignal(this._userService.cast, { initialValue: null as User | null });
	private _userId = computed(() => this._currentUser()?.id || null);
	private _wasmModule = signal<CedarWasmModule | null>(null);

	private _mergedPolicies = computed(() => {
		const userId = this._userId();
		const groups = this._usersService.groups();
		if (!userId || !groups.length) return '';

		const userGroups = groups.filter((gi) => gi.group.users?.some((u) => u.id === userId));

		return userGroups
			.map((gi) => gi.group.cedarPolicy)
			.filter((p): p is string => !!p && p.trim().length > 0)
			.join('\n\n');
	});

	public readonly ready = computed(() => !!this._wasmModule() && !!this._mergedPolicies() && !!this._userId());

	private _signals = new Map<string, Signal<boolean | null>>();

	constructor() {
		this._cedarWasm.load().then((mod) => {
			this._wasmModule.set(mod);
		});
	}

	canI(action: string, resourceType: string, resourceId: string): Signal<boolean | null> {
		const key = `${action}|${resourceType}|${resourceId}`;
		let sig = this._signals.get(key);
		if (!sig) {
			sig = computed(() => this._evaluate(action, resourceType, resourceId));
			this._signals.set(key, sig);
		}
		return sig;
	}

	canIAny(action: string, resourceType: string): Signal<boolean | null> {
		const key = `any|${action}|${resourceType}`;
		let sig = this._signals.get(key);
		if (!sig) {
			sig = computed(() => this._evaluatePartial(action, resourceType));
			this._signals.set(key, sig);
		}
		return sig;
	}

	private _evaluatePartial(action: string, resourceType: string): boolean | null {
		const cedar = this._wasmModule();
		const mergedPolicies = this._mergedPolicies();
		const userId = this._userId();

		if (!cedar || !mergedPolicies || !userId) return null;

		const result = cedar.isAuthorizedPartial({
			principal: { type: 'RocketAdmin::User', id: userId },
			action: { type: 'RocketAdmin::Action', id: action },
			resource: null,
			context: {},
			policies: {
				staticPolicies: mergedPolicies,
				templates: {},
				templateLinks: [],
			},
			entities: [],
		});

		if (result.type === 'residuals') {
			// decision is 'allow' (unconditionally allowed), 'deny' (unconditionally denied),
			// or null (depends on resource — meaning at least one resource could be allowed)
			return result.response.decision !== 'deny';
		}

		console.warn('Cedar partial authorization failed:', result.errors);
		return false;
	}

	private _evaluate(action: string, resourceType: string, resourceId: string): boolean | null {
		const cedar = this._wasmModule();
		const mergedPolicies = this._mergedPolicies();
		const userId = this._userId();

		if (!cedar || !mergedPolicies || !userId) return null;

		const result = cedar.isAuthorized({
			principal: { type: 'RocketAdmin::User', id: userId },
			action: { type: 'RocketAdmin::Action', id: action },
			resource: { type: `RocketAdmin::${resourceType}`, id: resourceId },
			context: {},
			policies: {
				staticPolicies: mergedPolicies,
				templates: {},
				templateLinks: [],
			},
			entities: [],
		});

		if (result.type === 'success') {
			return result.response.decision === 'allow';
		}

		console.warn('Cedar authorization failed:', result.errors);
		return false;
	}
}
