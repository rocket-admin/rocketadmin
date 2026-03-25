import { Injectable, inject } from '@angular/core';
import { CedarWasmService } from './cedar-wasm.service';

export interface CedarValidationResult {
	valid: boolean;
	errors: string[];
}

@Injectable({ providedIn: 'root' })
export class CedarValidatorService {
	private _cedarWasm = inject(CedarWasmService);

	async validate(policyText: string): Promise<CedarValidationResult> {
		if (!policyText.trim()) {
			return { valid: true, errors: [] };
		}

		const cedar = await this._cedarWasm.load();
		const result = cedar.checkParsePolicySet({
			staticPolicies: policyText,
			templates: {},
			templateLinks: [],
		});

		if (result.type === 'success') {
			return { valid: true, errors: [] };
		}

		const errors = (result.errors ?? []).map((e: unknown) => {
			if (typeof e === 'string') return e;
			if (e && typeof e === 'object' && 'message' in e) return (e as { message: string }).message;
			return String(e);
		});
		return { valid: false, errors };
	}
}
